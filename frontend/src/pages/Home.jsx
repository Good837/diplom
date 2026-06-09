import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { apiFetch, apiFetchFormData } from '../api/client';
import { CategoryScroller } from '../components/CategoryScroller';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeFilters, timePresetToQuery } from '../components/RecipeFilters';
import { RecipeForm } from '../components/RecipeForm';
import { RecipeModal } from '../components/RecipeModal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../state/auth';

const PER_PAGE = 12;

function readFiltersFromParams(searchParams) {
  const pageRaw = parseInt(searchParams.get('page') || '1', 10);
  return {
    q: searchParams.get('q') || '',
    categoryId: searchParams.get('category_id') || '',
    timePreset: searchParams.get('time') || '',
    ingredient: searchParams.get('ingredient') || '',
    sort: searchParams.get('sort') || 'newest',
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

function buildRecipesQuery({ q, categoryId, cookingTimeMin, cookingTimeMax, ingredient, sort, page }) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (categoryId) params.set('category_id', categoryId);
  if (cookingTimeMin != null) params.set('cooking_time_min', String(cookingTimeMin));
  if (cookingTimeMax != null) params.set('cooking_time_max', String(cookingTimeMax));
  if (ingredient.trim()) params.set('ingredient', ingredient.trim());
  if (sort && sort !== 'newest') params.set('sort', sort);
  params.set('page', String(page));
  params.set('per_page', String(PER_PAGE));
  return `?${params.toString()}`;
}

function buildCatalogSearchParams({ q, categoryId, timePreset, ingredient, sort, page }) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (categoryId) params.set('category_id', categoryId);
  if (timePreset) params.set('time', timePreset);
  if (ingredient.trim()) params.set('ingredient', ingredient.trim());
  if (sort && sort !== 'newest') params.set('sort', sort);
  if (page > 1) params.set('page', String(page));
  return params;
}

export function Home() {
  const auth = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initial = readFiltersFromParams(searchParams);

  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [q, setQ] = useState(initial.q);
  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [timePreset, setTimePreset] = useState(initial.timePreset);
  const [ingredient, setIngredient] = useState(initial.ingredient);
  const [sort, setSort] = useState(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [listMeta, setListMeta] = useState({ total: 0, pages: 1 });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalRecipeId, setModalRecipeId] = useState(null);

  useEffect(() => {
    const next = readFiltersFromParams(searchParams);
    setQ(next.q);
    setCategoryId(next.categoryId);
    setTimePreset(next.timePreset);
    setIngredient(next.ingredient);
    setSort(next.sort);
    setPage(next.page);
  }, [searchParams]);

  useEffect(() => {
    async function loadCategories() {
      try {
        const cats = await apiFetch('/categories');
        setCategories(cats.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити категорії');
      }
    }
    loadCategories();
  }, []);

  const timeQuery = useMemo(() => timePresetToQuery(timePreset), [timePreset]);

  const recipesPath = useMemo(
    () =>
      `/recipes${buildRecipesQuery({
        q,
        categoryId,
        cookingTimeMin: timeQuery.cooking_time_min,
        cookingTimeMax: timeQuery.cooking_time_max,
        ingredient,
        sort,
        page,
      })}`,
    [q, categoryId, timeQuery, ingredient, sort, page]
  );

  const syncUrl = useCallback(
    (overrides = {}) => {
      const params = buildCatalogSearchParams({
        q,
        categoryId,
        timePreset,
        ingredient,
        sort,
        page,
        ...overrides,
      });
      setSearchParams(params, { replace: true });
    },
    [q, categoryId, timePreset, ingredient, sort, page, setSearchParams]
  );

  const fetchRecipes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const list = await apiFetch(recipesPath);
      setRecipes(list.items || []);
      setListMeta({
        total: list.total ?? 0,
        pages: list.pages ?? 1,
      });
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити рецепти');
    } finally {
      setLoading(false);
    }
  }, [recipesPath]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRecipes();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchRecipes]);

  function updateCategoryId(next) {
    setCategoryId(next);
    syncUrl({ categoryId: next, page: 1 });
  }

  function updateTimePreset(next) {
    setTimePreset(next);
    syncUrl({ timePreset: next, page: 1 });
  }

  function updateIngredient(next) {
    setIngredient(next);
    syncUrl({ ingredient: next, page: 1 });
  }

  function updateSort(next) {
    setSort(next);
    syncUrl({ sort: next, page: 1 });
  }

  function updatePage(next) {
    setPage(next);
    syncUrl({ page: next });
  }

  function resetFilters() {
    setCategoryId('');
    setTimePreset('');
    setIngredient('');
    setSort('newest');
    setPage(1);
    setQ('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  async function createRecipe(payload) {
    setBusy(true);
    setError('');
    try {
      let nextPayload = payload;
      if (payload.image_file) {
        const fd = new FormData();
        fd.append('file', payload.image_file);
        const uploaded = await apiFetchFormData('/uploads/recipe-image', { auth: true, formData: fd });
        nextPayload = { ...payload, image_url: uploaded.image_url };
        delete nextPayload.image_file;
      } else {
        delete nextPayload.image_file;
      }
      const data = await apiFetch('/recipes', { method: 'POST', auth: true, body: nextPayload });
      setRecipes((prev) => [data.recipe, ...prev]);
      setCreating(false);
      syncUrl({ page: 1 });
      fetchRecipes();
    } catch (e) {
      setError(e.message || 'Не вдалося створити рецепт');
    } finally {
      setBusy(false);
    }
  }

  async function createCategory() {
    if (!newCategory.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch('/categories', { method: 'POST', auth: true, body: { name: newCategory.trim() } });
      setCategories((prev) =>
        [...prev, { ...data.category, recipe_count: 0 }].sort((a, b) => a.name.localeCompare(b.name, 'uk'))
      );
      setNewCategory('');
    } catch (e) {
      setError(e.message || 'Не вдалося створити категорію');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <header className="catalogPageHeader">
        <h1 className="catalogPageTitle fontSerif">Каталог рецептів</h1>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <CategoryScroller categories={categories} categoryId={categoryId} onSelect={updateCategoryId} />

      <div className="catalogLayout">
        <RecipeFilters
          categories={categories}
          categoryId={categoryId}
          onCategoryChange={updateCategoryId}
          timePreset={timePreset}
          onTimePresetChange={updateTimePreset}
          ingredient={ingredient}
          onIngredientChange={updateIngredient}
          sort={sort}
          onSortChange={updateSort}
          onReset={resetFilters}
        />

        <div className="catalogMain">
          <div className="catalogToolbar">
            <span className="muted">
              {loading ? 'Оновлення…' : `${listMeta.total} рецептів`}
            </span>
            {auth.isAuthenticated ? (
              <button className="btn" type="button" onClick={() => setCreating(true)}>
                Створити рецепт
              </button>
            ) : (
              <div className="row">
                <Link className="btn" to="/register">
                  Почати
                </Link>
                <Link className="btn btnSecondary" to="/login">
                  Увійти
                </Link>
              </div>
            )}
          </div>

          {loading && !recipes.length ? <p className="muted">Завантаження рецептів…</p> : null}

          <div className="gridCards">
            {recipes.map((r) => (
              <RecipeCard key={r.id} recipe={r} onOpenDetails={setModalRecipeId} variant="catalog" />
            ))}
          </div>

          {!loading && recipes.length === 0 ? <p className="muted">Нічого не знайдено.</p> : null}

          <Pagination page={page} pages={listMeta.pages} onPageChange={updatePage} />
        </div>
      </div>

      {auth.isAuthenticated && auth.user?.is_admin ? (
        <details className="adminPanel">
          <summary>Керування категоріями</summary>
          <div className="card">
            <h2>Категорії</h2>
            <div className="row">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Нова категорія (напр., Супи)"
              />
              <button
                className="btn btnSecondary"
                type="button"
                onClick={createCategory}
                disabled={busy || !newCategory.trim()}
              >
                Додати
              </button>
            </div>
          </div>
        </details>
      ) : null}

      {creating ? (
        <div className="modalOverlay" role="presentation" onClick={() => !busy && setCreating(false)}>
          <div
            className="modalPanel modalPanelForm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-recipe-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modalHeader">
              <h2 id="create-recipe-title" className="modalTitle fontSerif">
                Новий рецепт
              </h2>
              <button
                type="button"
                className="btn btnSecondary btnSmall modalClose"
                onClick={() => setCreating(false)}
                disabled={busy}
                aria-label="Закрити"
              >
                ×
              </button>
            </div>
            <div className="modalBody">
              {categories.length ? (
                <RecipeForm
                  categories={categories}
                  submitLabel="Створити"
                  onSubmit={createRecipe}
                  onCancel={() => setCreating(false)}
                  busy={busy}
                />
              ) : (
                <p className="muted">Спершу створіть хоча б одну категорію (адміністратор).</p>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {modalRecipeId ? <RecipeModal recipeId={modalRecipeId} onClose={() => setModalRecipeId(null)} /> : null}
    </div>
  );
}

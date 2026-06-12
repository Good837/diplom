import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import { apiFetch, apiFetchFormData } from '../api/client';
import { CategoryScroller } from '../components/CategoryScroller';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeFilters, parseTimePresetsParam, timePresetsToQuery } from '../components/RecipeFilters';
import { RecipeForm } from '../components/RecipeForm';
import { RecipeModal } from '../components/RecipeModal';
import { Pagination } from '../components/Pagination';
import { useAuth } from '../state/auth';

const PER_PAGE = 12;

function parseCommaListParam(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseIngredientsParam(raw) {
  return parseCommaListParam(raw);
}

function parseCategoryIdsParam(searchParams) {
  let ids = parseCommaListParam(searchParams.get('category_id'));
  if (!ids.length) {
    ids = searchParams.getAll('category_id').flatMap((part) => parseCommaListParam(part));
  }
  const seen = new Set();
  return ids.filter((id) => {
    const key = String(id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseTimePresetsFromParams(searchParams) {
  let presets = parseTimePresetsParam(searchParams.get('time'));
  if (!presets.length) {
    const fromAll = searchParams.getAll('time').flatMap((part) => parseTimePresetsParam(part));
    const seen = new Set();
    presets = fromAll.filter((id) => {
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }
  return presets;
}

function readFiltersFromParams(searchParams) {
  const pageRaw = parseInt(searchParams.get('page') || '1', 10);
  let selectedIngredients = parseIngredientsParam(searchParams.get('ingredients'));
  if (!selectedIngredients.length) {
    selectedIngredients = searchParams.getAll('ingredient').map((part) => part.trim()).filter(Boolean);
  }
  const seenIngredients = new Set();
  selectedIngredients = selectedIngredients.filter((name) => {
    const key = name.toLowerCase();
    if (seenIngredients.has(key)) return false;
    seenIngredients.add(key);
    return true;
  });

  return {
    q: searchParams.get('q') || '',
    selectedCategoryIds: parseCategoryIdsParam(searchParams),
    selectedTimePresets: parseTimePresetsFromParams(searchParams),
    selectedIngredients,
    sort: searchParams.get('sort') || 'newest',
    page: Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1,
  };
}

function buildRecipesQuery({ q, selectedCategoryIds, selectedTimePresets, selectedIngredients, sort, page }) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (selectedCategoryIds?.length) params.set('category_id', selectedCategoryIds.join(','));
  const timeQuery = timePresetsToQuery(selectedTimePresets);
  if (timeQuery.time) params.set('time', timeQuery.time);
  if (selectedIngredients?.length) params.set('ingredients', selectedIngredients.join(','));
  if (sort && sort !== 'newest') params.set('sort', sort);
  params.set('page', String(page));
  params.set('per_page', String(PER_PAGE));
  return `?${params.toString()}`;
}

function buildCatalogSearchParams({ q, selectedCategoryIds, selectedTimePresets, selectedIngredients, sort, page }) {
  const params = new URLSearchParams();
  if (q.trim()) params.set('q', q.trim());
  if (selectedCategoryIds?.length) params.set('category_id', selectedCategoryIds.join(','));
  if (selectedTimePresets?.length) params.set('time', selectedTimePresets.join(','));
  if (selectedIngredients?.length) params.set('ingredients', selectedIngredients.join(','));
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
  const [selectedCategoryIds, setSelectedCategoryIds] = useState(initial.selectedCategoryIds);
  const [selectedTimePresets, setSelectedTimePresets] = useState(initial.selectedTimePresets);
  const [selectedIngredients, setSelectedIngredients] = useState(initial.selectedIngredients);
  const [allIngredients, setAllIngredients] = useState([]);
  const [ingredientsLoading, setIngredientsLoading] = useState(true);
  const [sort, setSort] = useState(initial.sort);
  const [page, setPage] = useState(initial.page);
  const [listMeta, setListMeta] = useState({ total: 0, pages: 1 });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modalRecipeId, setModalRecipeId] = useState(null);

  useEffect(() => {
    const next = readFiltersFromParams(searchParams);
    setQ(next.q);
    setSelectedCategoryIds(next.selectedCategoryIds);
    setSelectedTimePresets(next.selectedTimePresets);
    setSelectedIngredients(next.selectedIngredients);
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

  useEffect(() => {
    async function loadIngredients() {
      setIngredientsLoading(true);
      try {
        const data = await apiFetch('/ingredients');
        const items = (data.items || []).sort((a, b) => a.localeCompare(b, 'uk'));
        setAllIngredients(items);
      } catch (e) {
        setError((prev) => prev || e.message || 'Не вдалося завантажити інгредієнти');
      } finally {
        setIngredientsLoading(false);
      }
    }
    loadIngredients();
  }, []);

  const recipesPath = useMemo(
    () =>
      `/recipes${buildRecipesQuery({
        q,
        selectedCategoryIds,
        selectedTimePresets,
        selectedIngredients,
        sort,
        page,
      })}`,
    [q, selectedCategoryIds, selectedTimePresets, selectedIngredients, sort, page]
  );

  const syncUrl = useCallback(
    (overrides = {}) => {
      const params = buildCatalogSearchParams({
        q,
        selectedCategoryIds,
        selectedTimePresets,
        selectedIngredients,
        sort,
        page,
        ...overrides,
      });
      setSearchParams(params, { replace: true });
    },
    [q, selectedCategoryIds, selectedTimePresets, selectedIngredients, sort, page, setSearchParams]
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

  function updateSelectedCategoryIds(next) {
    setSelectedCategoryIds(next);
    syncUrl({ selectedCategoryIds: next, page: 1 });
  }

  function updateSelectedTimePresets(next) {
    setSelectedTimePresets(next);
    syncUrl({ selectedTimePresets: next, page: 1 });
  }

  function updateSelectedIngredients(next) {
    setSelectedIngredients(next);
    syncUrl({ selectedIngredients: next, page: 1 });
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
    setSelectedCategoryIds([]);
    setSelectedTimePresets([]);
    setSelectedIngredients([]);
    setSort('newest');
    setPage(1);
    setQ('');
    setSearchParams(new URLSearchParams(), { replace: true });
  }

  async function createRecipe(payload) {
    setBusy(true);
    setError('');
    setMessage('');
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
      setCreating(false);
      setMessage(
        data.message ||
          'Рецепт надіслано на модерацію. Після схвалення адміністратором він з’явиться в каталозі.'
      );
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
      {message ? <div className="success">{message}</div> : null}

      <CategoryScroller
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onSelect={updateSelectedCategoryIds}
      />

      <div className="catalogLayout">
        <RecipeFilters
          categories={categories}
          selectedCategoryIds={selectedCategoryIds}
          onCategoryChange={updateSelectedCategoryIds}
          selectedTimePresets={selectedTimePresets}
          onTimePresetsChange={updateSelectedTimePresets}
          selectedIngredients={selectedIngredients}
          onIngredientsChange={updateSelectedIngredients}
          allIngredients={allIngredients}
          ingredientsLoading={ingredientsLoading}
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

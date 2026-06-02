import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch, apiFetchFormData } from '../api/client';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeForm } from '../components/RecipeForm';
import { useAuth } from '../state/auth';

export function Home() {
  const auth = useAuth();
  const [recipes, setRecipes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      setError('');
      try {
        const [cats, list] = await Promise.all([
          apiFetch('/categories'),
          apiFetch('/recipes'),
        ]);
        setCategories(cats.items || []);
        setRecipes(list.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити дані');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    return `?${params.toString()}`;
  }, [q]);

  async function search() {
    setLoading(true);
    setError('');
    try {
      const list = await apiFetch(`/recipes${queryString}`);
      setRecipes(list.items || []);
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити рецепти');
    } finally {
      setLoading(false);
    }
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
      setCategories((prev) => [...prev, data.category].sort((a, b) => a.name.localeCompare(b.name, 'uk')));
      setNewCategory('');
    } catch (e) {
      setError(e.message || 'Не вдалося створити категорію');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <section className="hero">
        <div className="heroInner">
          <div className="heroCopy">
            <div className="heroKicker">Домашня кухня • Натхнення • Збереження</div>
            <h1 className="heroTitle">Збирайте рецепти й готуйте з настроєм</h1>
            <p className="muted heroText">TastyHub допоможе зберігати улюблені рецепти, швидко знаходити ідеї та ділитися ними.</p>

            <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {auth.isAuthenticated ? (
                <button className="btn" onClick={() => setCreating((v) => !v)}>
                  {creating ? 'Закрити форму' : 'Створити рецепт'}
                </button>
              ) : (
                <>
                  <Link className="btn" to="/register">
                    Почати
                  </Link>
                  <Link className="btn btnSecondary" to="/login">
                    Увійти
                  </Link>
                </>
              )}
              <a className="btn btnSecondary" href="#recipes">
                Переглянути рецепти
              </a>
            </div>
          </div>

          <div className="heroArt" aria-hidden="true">
            <div className="heroBlob heroBlobA" />
            <div className="heroBlob heroBlobB" />
            <div className="heroPlate">
              <div className="heroPlateInner" />
            </div>
            <div className="heroBadge">Смачні ідеї щодня</div>
          </div>
        </div>
      </section>

      {error ? <div className="alert">{error}</div> : null}

      <div className="card">
        <div className="grid2">
          <label className="field" style={{ gridColumn: '1 / -1' }}>
            <span className="label">Пошук за назвою</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Напр., борщ" />
          </label>
        </div>

        <div className="row rowEnd">
          <button
            className="btn btnSecondary"
            onClick={() => {
              setQ('');
              search();
            }}
          >
            Скинути
          </button>
          <button className="btn" onClick={search} disabled={loading}>
            {loading ? 'Пошук…' : 'Знайти'}
          </button>
        </div>
      </div>

      {auth.isAuthenticated && auth.user?.is_admin ? (
        <div className="card">
          <h2>Категорії</h2>
          <div className="row">
            <input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Нова категорія (напр., Супи)"
            />
            <button className="btn btnSecondary" onClick={createCategory} disabled={busy || !newCategory.trim()}>
              Додати
            </button>
          </div>
          <p className="muted" style={{ marginTop: 8 }}>
            Категорії потрібні для створення рецептів.
          </p>
        </div>
      ) : null}

      {creating ? (
        <div className="card">
          <h2>Новий рецепт</h2>
          {categories.length ? (
            <RecipeForm
              categories={categories}
              submitLabel="Створити"
              onSubmit={createRecipe}
              onCancel={() => setCreating(false)}
              busy={busy}
            />
          ) : (
            <p className="muted">
              Спершу створіть хоча б одну категорію.
            </p>
          )}
        </div>
      ) : null}

      {loading ? <p className="muted">Завантаження рецептів…</p> : null}

      <div id="recipes" className="gridCards">
        {recipes.map((r) => (
          <RecipeCard key={r.id} recipe={r} />
        ))}
      </div>

      {!loading && recipes.length === 0 ? <p className="muted">Нічого не знайдено.</p> : null}
    </div>
  );
}


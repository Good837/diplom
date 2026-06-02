import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { apiFetch } from '../api/client';
import { useAuth } from '../state/auth';

export function Admin() {
  const auth = useAuth();
  const [tab, setTab] = useState('categories');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState('');

  const [users, setUsers] = useState([]);
  const [usersQ, setUsersQ] = useState('');

  const [recipes, setRecipes] = useState([]);
  const [recipesQ, setRecipesQ] = useState('');

  const canSee = Boolean(auth.isAuthenticated && auth.user?.is_admin);

  const usersQueryString = useMemo(() => {
    const p = new URLSearchParams();
    if (usersQ.trim()) p.set('q', usersQ.trim());
    return `?${p.toString()}`;
  }, [usersQ]);

  const recipesQueryString = useMemo(() => {
    const p = new URLSearchParams();
    if (recipesQ.trim()) p.set('q', recipesQ.trim());
    return `?${p.toString()}`;
  }, [recipesQ]);

  useEffect(() => {
    async function loadCats() {
      setError('');
      try {
        const data = await apiFetch('/categories');
        setCategories(data.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити категорії');
      }
    }
    loadCats();
  }, []);

  useEffect(() => {
    async function loadUsers() {
      if (!canSee || tab !== 'users') return;
      setError('');
      try {
        const data = await apiFetch(`/users${usersQueryString}`, { auth: true });
        setUsers(data.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити користувачів');
      }
    }
    loadUsers();
  }, [tab, usersQueryString, canSee]);

  useEffect(() => {
    async function loadRecipes() {
      if (!canSee || tab !== 'recipes') return;
      setError('');
      try {
        const data = await apiFetch(`/recipes${recipesQueryString}`);
        setRecipes(data.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити рецепти');
      }
    }
    loadRecipes();
  }, [tab, recipesQueryString, canSee]);

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

  async function deleteCategory(id) {
    if (!window.confirm('Видалити категорію?')) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/categories/${id}`, { method: 'DELETE', auth: true });
      setCategories((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e.message || 'Не вдалося видалити категорію');
    } finally {
      setBusy(false);
    }
  }

  async function deleteUser(id) {
    if (!window.confirm('Видалити користувача?')) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/users/${id}`, { method: 'DELETE', auth: true });
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (e) {
      setError(e.message || 'Не вдалося видалити користувача');
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecipe(id) {
    if (!window.confirm('Видалити рецепт?')) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/recipes/${id}`, { method: 'DELETE', auth: true });
      setRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.message || 'Не вдалося видалити рецепт');
    } finally {
      setBusy(false);
    }
  }

  if (!auth.loading && !auth.isAuthenticated) return <Navigate to="/login" replace />;
  if (!auth.loading && auth.isAuthenticated && !auth.user?.is_admin) return <Navigate to="/" replace />;
  if (!canSee) return <p className="muted">Завантаження…</p>;

  return (
    <div>
      <div className="pageHeader">
        <div>
          <h1>Адмін‑панель</h1>
          <p className="muted">Керування категоріями, користувачами та рецептами.</p>
        </div>
      </div>

      {error ? <div className="alert">{error}</div> : null}

      <div className="card">
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <button className={tab === 'categories' ? 'btn' : 'btn btnSecondary'} onClick={() => setTab('categories')}>
            Категорії
          </button>
          <button className={tab === 'users' ? 'btn' : 'btn btnSecondary'} onClick={() => setTab('users')}>
            Користувачі
          </button>
          <button className={tab === 'recipes' ? 'btn' : 'btn btnSecondary'} onClick={() => setTab('recipes')}>
            Рецепти
          </button>
        </div>
      </div>

      {tab === 'categories' ? (
        <div className="card">
          <h2>Категорії</h2>
          <div className="row">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Нова категорія" />
            <button className="btn" onClick={createCategory} disabled={busy || !newCategory.trim()}>
              Додати
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 8 }}>
            {categories.map((c) => (
              <div key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
                <span>{c.name}</span>
                <button className="btn btnDanger btnSmall" onClick={() => deleteCategory(c.id)} disabled={busy}>
                  Видалити
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'users' ? (
        <div className="card">
          <h2>Користувачі</h2>
          <div className="row">
            <input value={usersQ} onChange={(e) => setUsersQ(e.target.value)} placeholder="Пошук (username/email/ім’я)" />
            <button className="btn btnSecondary" onClick={() => setUsersQ('')} disabled={busy}>
              Скинути
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {users.map((u) => (
              <div key={u.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    {u.display_name || `@${u.username}`} {u.is_admin ? <span className="muted">• admin</span> : null}
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    @{u.username} • {u.email}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Link className="muted" to={`/u/${u.username}`}>
                      Публічний профіль
                    </Link>
                  </div>
                </div>
                <button className="btn btnDanger btnSmall" onClick={() => deleteUser(u.id)} disabled={busy}>
                  Видалити
                </button>
              </div>
            ))}
            {!users.length ? <p className="muted">Нічого не знайдено.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === 'recipes' ? (
        <div className="card">
          <h2>Рецепти</h2>
          <div className="row">
            <input value={recipesQ} onChange={(e) => setRecipesQ(e.target.value)} placeholder="Пошук за назвою" />
            <button className="btn btnSecondary" onClick={() => setRecipesQ('')} disabled={busy}>
              Скинути
            </button>
          </div>
          <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
            {recipes.map((r) => (
              <div key={r.id} className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 800 }}>
                    <Link to={`/recipes/${r.id}`}>{r.title}</Link>
                  </div>
                  <div className="muted" style={{ fontSize: 13 }}>
                    {r.category?.name || 'Без категорії'} • Автор:{' '}
                    {r.owner?.username ? <Link to={`/u/${r.owner.username}`}>@{r.owner.username}</Link> : '—'}
                  </div>
                </div>
                <button className="btn btnDanger btnSmall" onClick={() => deleteRecipe(r.id)} disabled={busy}>
                  Видалити
                </button>
              </div>
            ))}
            {!recipes.length ? <p className="muted">Нічого не знайдено.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}


import React, { useEffect, useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { apiFetch, apiFetchFormData, resolveAssetUrl } from '../api/client';
import { CATEGORY_ICONS, CategoryIcon } from '../components/CategoryIcon';
import { useAuth } from '../state/auth';
import { formatCommentDate } from '../utils/formatDate';

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

  const [pendingRecipes, setPendingRecipes] = useState([]);

  const [comments, setComments] = useState([]);

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

  useEffect(() => {
    async function loadPendingRecipes() {
      if (!canSee || tab !== 'moderation') return;
      setError('');
      try {
        const data = await apiFetch('/admin/recipes/pending', { auth: true });
        setPendingRecipes(data.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити чергу модерації');
      }
    }
    loadPendingRecipes();
  }, [tab, canSee]);

  useEffect(() => {
    async function loadComments() {
      if (!canSee || tab !== 'comments') return;
      setError('');
      try {
        const data = await apiFetch('/admin/comments', { auth: true });
        setComments(data.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити коментарі');
      }
    }
    loadComments();
  }, [tab, canSee]);

  async function deleteComment(id) {
    if (!window.confirm('Видалити коментар?')) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/comments/${id}`, { method: 'DELETE', auth: true });
      setComments((prev) => prev.filter((c) => c.id !== id));
    } catch (e) {
      setError(e.message || 'Не вдалося видалити коментар');
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

  function replaceCategory(updated) {
    setCategories((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c)).sort((a, b) => a.name.localeCompare(b.name, 'uk'))
    );
  }

  async function updateCategoryIcon(id, iconIndex) {
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch(`/categories/${id}`, {
        method: 'PUT',
        auth: true,
        body: { icon_index: iconIndex },
      });
      replaceCategory(data.category);
    } catch (e) {
      setError(e.message || 'Не вдалося оновити іконку');
    } finally {
      setBusy(false);
    }
  }

  async function uploadCategoryImage(id, file) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiFetchFormData(`/categories/${id}/image`, { auth: true, formData: fd });
      replaceCategory(data.category);
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити зображення');
    } finally {
      setBusy(false);
    }
  }

  async function clearCategoryImage(id) {
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch(`/categories/${id}`, {
        method: 'PUT',
        auth: true,
        body: { image_url: null },
      });
      replaceCategory(data.category);
    } catch (e) {
      setError(e.message || 'Не вдалося прибрати зображення');
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
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.message || 'Не вдалося видалити рецепт');
    } finally {
      setBusy(false);
    }
  }

  async function moderateRecipe(id, action) {
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/admin/recipes/${id}/${action}`, { method: 'POST', auth: true });
      setPendingRecipes((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      setError(e.message || 'Не вдалося оновити статус рецепта');
    } finally {
      setBusy(false);
    }
  }

  if (!auth.loading && !auth.isAuthenticated) return <Navigate to="/login" replace />;
  if (!auth.loading && auth.isAuthenticated && !auth.user?.is_admin) return <Navigate to="/" replace />;
  if (!canSee) return <p className="muted">Завантаження…</p>;

  return (
    <div>
      <header className="catalogPageHeader adminPageHeader">
        <h1 className="catalogPageTitle fontSerif">Адмін‑панель</h1>
      </header>

      {error ? <div className="alert">{error}</div> : null}

      <div className="adminTabs">
        <button className={tab === 'categories' ? 'btn' : 'btn btnSecondary'} type="button" onClick={() => setTab('categories')}>
          Категорії
        </button>
        <button className={tab === 'users' ? 'btn' : 'btn btnSecondary'} type="button" onClick={() => setTab('users')}>
          Користувачі
        </button>
        <button className={tab === 'moderation' ? 'btn' : 'btn btnSecondary'} type="button" onClick={() => setTab('moderation')}>
          Модерація рецептів
        </button>
        <button className={tab === 'recipes' ? 'btn' : 'btn btnSecondary'} type="button" onClick={() => setTab('recipes')}>
          Рецепти
        </button>
        <button className={tab === 'comments' ? 'btn' : 'btn btnSecondary'} type="button" onClick={() => setTab('comments')}>
          Коментарі
        </button>
      </div>

      {tab === 'categories' ? (
        <div className="contentBlock">
          <h2 className="contentBlockTitle fontSerif">Категорії</h2>
          <div className="row">
            <input value={newCategory} onChange={(e) => setNewCategory(e.target.value)} placeholder="Нова категорія" />
            <button className="btn" type="button" onClick={createCategory} disabled={busy || !newCategory.trim()}>
              Додати
            </button>
          </div>
          <div className="adminList">
            {categories.map((c) => (
              <div key={c.id} className="adminListItem adminCategoryItem">
                <div className="adminCategoryMain">
                  <div className="adminCategoryPreview">
                    {c.image_url ? (
                      <img src={resolveAssetUrl(c.image_url)} alt="" />
                    ) : (
                      <CategoryIcon index={c.icon_index ?? 0} />
                    )}
                  </div>
                  <span className="adminListItemTitle">{c.name}</span>
                </div>
                <div className="adminCategoryControls">
                  <label className="adminCategoryField">
                    <span className="muted adminCategoryFieldLabel">Іконка</span>
                    <select
                      value={String(c.icon_index ?? 0)}
                      disabled={busy || Boolean(c.image_url)}
                      onChange={(e) => updateCategoryIcon(c.id, Number(e.target.value))}
                    >
                      {CATEGORY_ICONS.map((icon) => (
                        <option key={icon.id} value={icon.id}>
                          {icon.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="btn btnSecondary btnSmall adminCategoryUpload">
                    Завантажити фото
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      disabled={busy}
                      hidden
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        uploadCategoryImage(c.id, file);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {c.image_url ? (
                    <button
                      className="btn btnSecondary btnSmall"
                      type="button"
                      disabled={busy}
                      onClick={() => clearCategoryImage(c.id)}
                    >
                      Прибрати фото
                    </button>
                  ) : null}
                  <button className="btn btnDanger btnSmall" type="button" onClick={() => deleteCategory(c.id)} disabled={busy}>
                    Видалити
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {tab === 'users' ? (
        <div className="contentBlock">
          <h2 className="contentBlockTitle fontSerif">Користувачі</h2>
          <div className="row">
            <input value={usersQ} onChange={(e) => setUsersQ(e.target.value)} placeholder="Пошук (username/email/ім’я)" />
            <button className="btn btnSecondary" type="button" onClick={() => setUsersQ('')} disabled={busy}>
              Скинути
            </button>
          </div>
          <div className="adminList">
            {users.map((u) => (
              <div key={u.id} className="adminListItem">
                <div>
                  <div className="adminListItemTitle">
                    {u.display_name || `@${u.username}`} {u.is_admin ? <span className="muted"> • admin</span> : null}
                  </div>
                  <div className="adminListItemMeta">
                    @{u.username} • {u.email}
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <Link to={`/u/${u.username}`}>Публічний профіль →</Link>
                  </div>
                </div>
                <button className="btn btnDanger btnSmall" type="button" onClick={() => deleteUser(u.id)} disabled={busy}>
                  Видалити
                </button>
              </div>
            ))}
            {!users.length ? <p className="muted">Нічого не знайдено.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === 'moderation' ? (
        <div className="contentBlock">
          <h2 className="contentBlockTitle fontSerif">Модерація рецептів</h2>
          <p className="muted">Рецепти, що очікують схвалення перед публікацією в каталозі.</p>
          <div className="adminList">
            {pendingRecipes.map((r) => (
              <div key={r.id} className="adminListItem">
                <div>
                  <div className="adminListItemTitle">
                    <Link to={`/recipes/${r.id}`}>{r.title}</Link>
                  </div>
                  <div className="adminListItemMeta">
                    {r.category?.name || 'Без категорії'} • Автор:{' '}
                    {r.owner?.username ? <Link to={`/u/${r.owner.username}`}>@{r.owner.username}</Link> : '—'}
                  </div>
                </div>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button
                    className="btn btnSmall"
                    type="button"
                    onClick={() => moderateRecipe(r.id, 'approve')}
                    disabled={busy}
                  >
                    Схвалити
                  </button>
                  <button
                    className="btn btnDanger btnSmall"
                    type="button"
                    onClick={() => moderateRecipe(r.id, 'reject')}
                    disabled={busy}
                  >
                    Відхилити
                  </button>
                </div>
              </div>
            ))}
            {!pendingRecipes.length ? <p className="muted">Немає рецептів на модерації.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === 'recipes' ? (
        <div className="contentBlock">
          <h2 className="contentBlockTitle fontSerif">Рецепти</h2>
          <div className="row">
            <input value={recipesQ} onChange={(e) => setRecipesQ(e.target.value)} placeholder="Пошук за назвою" />
            <button className="btn btnSecondary" type="button" onClick={() => setRecipesQ('')} disabled={busy}>
              Скинути
            </button>
          </div>
          <div className="adminList">
            {recipes.map((r) => (
              <div key={r.id} className="adminListItem">
                <div>
                  <div className="adminListItemTitle">
                    <Link to={`/recipes/${r.id}`}>{r.title}</Link>
                  </div>
                  <div className="adminListItemMeta">
                    {r.category?.name || 'Без категорії'} • Автор:{' '}
                    {r.owner?.username ? <Link to={`/u/${r.owner.username}`}>@{r.owner.username}</Link> : '—'}
                  </div>
                </div>
                <button className="btn btnDanger btnSmall" type="button" onClick={() => deleteRecipe(r.id)} disabled={busy}>
                  Видалити
                </button>
              </div>
            ))}
            {!recipes.length ? <p className="muted">Нічого не знайдено.</p> : null}
          </div>
        </div>
      ) : null}

      {tab === 'comments' ? (
        <div className="contentBlock">
          <h2 className="contentBlockTitle fontSerif">Модерація коментарів</h2>
          <div className="adminList">
            {comments.map((c) => (
              <div key={c.id} className="adminListItem">
                <div>
                  <p className="pre" style={{ margin: '0 0 8px' }}>
                    {c.body}
                  </p>
                  <div className="adminListItemMeta">
                    {c.recipe_title ? (
                      <>
                        Рецепт: <Link to={`/recipes/${c.recipe_id}`}>{c.recipe_title}</Link>
                        {' • '}
                      </>
                    ) : null}
                    {c.author?.username ? (
                      <>
                        Автор: <Link to={`/u/${c.author.username}`}>@{c.author.username}</Link>
                      </>
                    ) : (
                      'Автор: —'
                    )}
                    {c.created_at ? <> • {formatCommentDate(c.created_at)}</> : null}
                  </div>
                </div>
                <button className="btn btnDanger btnSmall" type="button" onClick={() => deleteComment(c.id)} disabled={busy}>
                  Видалити
                </button>
              </div>
            ))}
            {!comments.length ? <p className="muted">Коментарів немає.</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}


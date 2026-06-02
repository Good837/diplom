import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';

import { apiFetch, apiFetchFormData, resolveAssetUrl } from '../api/client';
import { RecipeForm } from '../components/RecipeForm';
import { useAuth } from '../state/auth';

export function RecipeDetails() {
  const { id } = useParams();
  const recipeId = Number(id);
  const auth = useAuth();
  const navigate = useNavigate();

  const [recipe, setRecipe] = useState(null);
  const [categories, setCategories] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentBody, setCommentBody] = useState('');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const isOwner = useMemo(() => {
    return auth.user && recipe && recipe.owner && auth.user.id === recipe.owner.id;
  }, [auth.user, recipe]);

  const canDelete = useMemo(() => {
    return Boolean(auth.isAuthenticated && (isOwner || auth.user?.is_admin));
  }, [auth.isAuthenticated, isOwner, auth.user]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const base = await Promise.all([
          apiFetch('/categories'),
          apiFetch(`/recipes/${recipeId}`),
          apiFetch(`/recipes/${recipeId}/comments`),
        ]);
        const [cats, data, commentsData] = base;
        setCategories(cats.items || []);
        setRecipe(data.recipe);
        setComments(commentsData.items || []);

        if (auth.isAuthenticated) {
          const savedList = await apiFetch('/users/me/saved', { auth: true });
          const isSaved = (savedList.items || []).some((r) => r.id === recipeId);
          setSaved(isSaved);
        } else {
          setSaved(false);
        }
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити рецепт');
      } finally {
        setLoading(false);
      }
    }
    if (Number.isFinite(recipeId)) load();
  }, [recipeId, auth.isAuthenticated]);

  async function updateRecipe(payload) {
    setBusy(true);
    setError('');
    try {
      let nextPayload = payload;
      if (payload.image_file) {
        const fd = new FormData();
        fd.append('file', payload.image_file);
        const uploaded = await apiFetchFormData('/uploads/recipe-image', { auth: true, formData: fd });
        nextPayload = { ...payload, image_url: uploaded.image_url };
      }
      delete nextPayload.image_file;
      const data = await apiFetch(`/recipes/${recipeId}`, { method: 'PUT', auth: true, body: nextPayload });
      setRecipe(data.recipe);
      setEditing(false);
    } catch (e) {
      setError(e.message || 'Не вдалося оновити рецепт');
    } finally {
      setBusy(false);
    }
  }

  async function deleteRecipe() {
    if (!window.confirm('Ви впевнені, що хочете видалити цей рецепт?')) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/recipes/${recipeId}`, { method: 'DELETE', auth: true });
      navigate('/');
    } catch (e) {
      setError(e.message || 'Не вдалося видалити рецепт');
    } finally {
      setBusy(false);
    }
  }

  async function submitComment() {
    if (!commentBody.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch(`/recipes/${recipeId}/comments`, {
        method: 'POST',
        auth: true,
        body: { body: commentBody.trim() },
      });
      setComments((prev) => [...prev, data.comment]);
      setCommentBody('');
    } catch (e) {
      setError(e.message || 'Не вдалося додати коментар');
    } finally {
      setBusy(false);
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm('Видалити коментар?')) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/comments/${commentId}`, { method: 'DELETE', auth: true });
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      setError(e.message || 'Не вдалося видалити коментар');
    } finally {
      setBusy(false);
    }
  }

  async function toggleSaved() {
    if (!auth.isAuthenticated) return;
    setBusy(true);
    setError('');
    try {
      if (!saved) {
        await apiFetch(`/recipes/${recipeId}/save`, { method: 'POST', auth: true });
        setSaved(true);
      } else {
        await apiFetch(`/recipes/${recipeId}/save`, { method: 'DELETE', auth: true });
        setSaved(false);
      }
    } catch (e) {
      setError(e.message || 'Не вдалося оновити збережені');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Завантаження…</p>;
  if (error) return <div className="alert">{error}</div>;
  if (!recipe) return <div className="alert">Рецепт не знайдено</div>;

  return (
    <div>
      <section className="recipeHero">
        <div className="recipeHeroInner">
          <div className="recipeHeroMedia">
            <div className="recipeHeroBlob recipeHeroBlobA" aria-hidden="true" />
            <div className="recipeHeroBlob recipeHeroBlobB" aria-hidden="true" />

            <div className="recipeHeroImg">
              {recipe.image_url ? (
                <img src={resolveAssetUrl(recipe.image_url)} alt={recipe.title} />
              ) : (
                <div className="recipeHeroImgPlaceholder" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="recipeHeroCopy">
            <div className="breadcrumbs">
              <Link to="/">Головна</Link> <span className="muted">/</span> <span>Деталі рецепту</span>
            </div>

            <h1 className="recipeHeroTitle">{recipe.title}</h1>

            <div className="pillRow">
              <span className="pill">{recipe.category?.name || 'Без категорії'}</span>
              <span className="pill pillSoft">{recipe.cooking_time} хв</span>
              <span className="pill pillSoft">
                Автор:{' '}
                {recipe.owner?.username ? <Link to={`/u/${recipe.owner.username}`}>@{recipe.owner.username}</Link> : '—'}
              </span>
            </div>

            <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              {auth.isAuthenticated ? (
                <button className={saved ? 'btn btnSecondary' : 'btn'} onClick={toggleSaved} disabled={busy}>
                  {saved ? 'Збережено' : 'Зберегти'}
                </button>
              ) : null}

              {auth.isAuthenticated && canDelete ? (
                <>
                  {isOwner ? (
                    <button className="btn btnSecondary" onClick={() => setEditing((v) => !v)} disabled={busy}>
                      {editing ? 'Закрити' : 'Редагувати'}
                    </button>
                  ) : null}
                  <button className="btn btnDanger" onClick={deleteRecipe} disabled={busy || !canDelete}>
                    {busy ? 'Видалення…' : 'Видалити'}
                  </button>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      {editing ? (
        <div className="card">
          <h2>Редагування</h2>
          <RecipeForm
            categories={categories}
            initial={recipe}
            submitLabel="Оновити"
            onSubmit={updateRecipe}
            onCancel={() => setEditing(false)}
            busy={busy}
          />
        </div>
      ) : null}

      <div className="card">
        <h2>Опис</h2>
        <p className="pre">{recipe.description}</p>
      </div>

      <div className="card">
        <h2>Інгредієнти</h2>
        <p className="pre">{recipe.ingredients}</p>
      </div>

      <div className="card">
        <h2>Інструкції</h2>
        <p className="pre">{recipe.instructions}</p>
      </div>

      <div className="card">
        <h2>Коментарі</h2>
        {auth.isAuthenticated ? (
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <textarea
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              rows={3}
              placeholder="Ваш коментар…"
            />
            <button className="btn" onClick={submitComment} disabled={busy || !commentBody.trim()}>
              Додати
            </button>
          </div>
        ) : (
          <p className="muted">
            Щоб залишати коментарі, потрібно <Link to="/login">увійти</Link>.
          </p>
        )}

        <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
          {comments.map((c) => {
            const canRemove = auth.isAuthenticated && (auth.user?.is_admin || auth.user?.id === c.author?.id);
            return (
              <div key={c.id} className="card" style={{ margin: 0 }}>
                <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: 9,
                          overflow: 'hidden',
                          border: '1px solid rgba(255,255,255,0.10)',
                          background: 'rgba(255,255,255,0.04)',
                          flex: '0 0 auto',
                        }}
                      >
                        {c.author?.avatar_url ? (
                          <img
                            src={resolveAssetUrl(c.author.avatar_url)}
                            alt=""
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : null}
                      </div>
                      <div className="muted" style={{ fontSize: 13 }}>
                        {c.author?.username ? <Link to={`/u/${c.author.username}`}>@{c.author.username}</Link> : '—'}
                      </div>
                    </div>
                    <p className="pre" style={{ marginTop: 6 }}>
                      {c.body}
                    </p>
                  </div>
                  {canRemove ? (
                    <button className="btn btnDanger btnSmall" onClick={() => deleteComment(c.id)} disabled={busy}>
                      Видалити
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
          {!comments.length ? <p className="muted">Коментарів поки немає.</p> : null}
        </div>
      </div>
    </div>
  );
}


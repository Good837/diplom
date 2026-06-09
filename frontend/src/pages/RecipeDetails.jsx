import React, { useEffect, useMemo, useState } from 'react';

import { Link, useNavigate, useParams } from 'react-router-dom';



import { apiFetch, apiFetchFormData, resolveAssetUrl } from '../api/client';

import { RecipeForm } from '../components/RecipeForm';
import { StarRating } from '../components/StarRating';
import { useAuth } from '../state/auth';
import { formatCommentDate } from '../utils/formatDate';
import { formatIngredientDisplay } from '../utils/ingredients';



export function RecipeDetails() {

  const { id } = useParams();

  const recipeId = Number(id);

  const auth = useAuth();

  const navigate = useNavigate();



  const [recipe, setRecipe] = useState(null);

  const [categories, setCategories] = useState([]);

  const [comments, setComments] = useState([]);

  const [commentBody, setCommentBody] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentBody, setEditCommentBody] = useState('');

  const [saved, setSaved] = useState(false);
  const [inShoppingList, setInShoppingList] = useState(false);

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

          apiFetch(`/recipes/${recipeId}`, { auth: auth.isAuthenticated }),

          apiFetch(`/recipes/${recipeId}/comments`),

        ]);

        const [cats, data, commentsData] = base;

        setCategories(cats.items || []);

        setRecipe(data.recipe);

        setComments(commentsData.items || []);



        if (auth.isAuthenticated) {
          const [savedList, shopping] = await Promise.all([
            apiFetch('/users/me/saved', { auth: true }),
            apiFetch('/shopping-list', { auth: true }),
          ]);
          setSaved((savedList.items || []).some((r) => r.id === recipeId));
          setInShoppingList((shopping.recipes || []).some((r) => r.id === recipeId));
        } else {
          setSaved(false);
          setInShoppingList(false);
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



  async function submitRating(value) {
    if (!auth.isAuthenticated || isOwner) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch(`/recipes/${recipeId}/rating`, {
        method: 'PUT',
        auth: true,
        body: { value },
      });
      setRecipe(data.recipe);
    } catch (e) {
      setError(e.message || 'Не вдалося зберегти оцінку');
    } finally {
      setBusy(false);
    }
  }

  async function startEditComment(comment) {
    setEditingCommentId(comment.id);
    setEditCommentBody(comment.body);
  }

  async function saveEditComment(commentId) {
    if (!editCommentBody.trim()) return;
    setBusy(true);
    setError('');
    try {
      const data = await apiFetch(`/comments/${commentId}`, {
        method: 'PUT',
        auth: true,
        body: { body: editCommentBody.trim() },
      });
      setComments((prev) => prev.map((c) => (c.id === commentId ? data.comment : c)));
      setEditingCommentId(null);
      setEditCommentBody('');
    } catch (e) {
      setError(e.message || 'Не вдалося оновити коментар');
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

  async function toggleShoppingList() {
    if (!auth.isAuthenticated) return;
    setBusy(true);
    setError('');
    try {
      if (!inShoppingList) {
        await apiFetch(`/shopping-list/recipes/${recipeId}`, { method: 'POST', auth: true });
        setInShoppingList(true);
      } else {
        await apiFetch(`/shopping-list/recipes/${recipeId}`, { method: 'DELETE', auth: true });
        setInShoppingList(false);
      }
    } catch (e) {
      setError(e.message || 'Не вдалося оновити список покупок');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="muted">Завантаження…</p>;

  if (error && !recipe) return <div className="alert">{error}</div>;

  if (!recipe) return <div className="alert">Рецепт не знайдено</div>;



  return (

    <article className="detailPage">

      <nav className="breadcrumbs">

        <Link to="/">Каталог</Link>

        <span className="muted">/</span>

        <span>{recipe.title}</span>

      </nav>



      {error ? <div className="alert">{error}</div> : null}



      <div className="detailLayout">

        <div className="detailImageWrap">

          {recipe.image_url ? (

            <img className="detailImage" src={resolveAssetUrl(recipe.image_url)} alt={recipe.title} />

          ) : (

            <div className="detailImagePlaceholder" aria-hidden="true" />

          )}

        </div>



        <div className="detailAside">

          <h1 className="detailTitle fontSerif">{recipe.title}</h1>



          <div className="pillRow">

            <span className="pill">{recipe.category?.name || 'Без категорії'}</span>

            <span className="pill pillSoft">{recipe.cooking_time} хв</span>

            <span className="pill pillSoft">

              {recipe.owner?.username ? (

                <>

                  Автор: <Link to={`/u/${recipe.owner.username}`}>@{recipe.owner.username}</Link>

                </>

              ) : (

                'Автор: —'

              )}

            </span>

          </div>

          <StarRating
            ratingAvg={recipe.rating_avg}
            ratingCount={recipe.rating_count}
            myRating={recipe.my_rating}
            interactive
            disabled={busy}
            isOwner={isOwner}
            isAuthenticated={auth.isAuthenticated}
            onRate={submitRating}
          />

          <div className="row detailActions" style={{ flexWrap: 'wrap' }}>

            {auth.isAuthenticated ? (
              <>
                <button className={saved ? 'btn btnSecondary' : 'btn'} onClick={toggleSaved} disabled={busy} type="button">
                  {saved ? 'У улюблених' : 'Додати в улюблені'}
                </button>
                <button
                  className={inShoppingList ? 'btn btnSecondary' : 'btn'}
                  onClick={toggleShoppingList}
                  disabled={busy}
                  type="button"
                >
                  {inShoppingList ? 'У списку покупок' : 'До списку покупок'}
                </button>
              </>
            ) : (
              <Link className="btn btnSecondary" to="/login">
                Увійти, щоб зберегти
              </Link>
            )}



            {auth.isAuthenticated && canDelete ? (

              <>

                {isOwner ? (

                  <button className="btn btnSecondary" onClick={() => setEditing((v) => !v)} disabled={busy} type="button">

                    {editing ? 'Закрити' : 'Редагувати'}

                  </button>

                ) : null}

                <button className="btn btnDanger" onClick={deleteRecipe} disabled={busy} type="button">

                  {busy ? 'Видалення…' : 'Видалити'}

                </button>

              </>

            ) : null}

          </div>

        </div>

      </div>



      {editing ? (

        <div className="contentBlock">

          <h2 className="contentBlockTitle fontSerif">Редагування</h2>

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



      <section className="contentBlock">

        <h2 className="contentBlockTitle fontSerif">Опис</h2>

        <p className="pre">{recipe.description}</p>

      </section>



      <section className="contentBlock">

        <h2 className="contentBlockTitle fontSerif">Інгредієнти</h2>

        {Array.isArray(recipe.ingredients) && recipe.ingredients.length ? (
          <ul className="ingredientDisplayList">
            {recipe.ingredients.map((item, index) => (
              <li key={index}>{formatIngredientDisplay(item)}</li>
            ))}
          </ul>
        ) : (
          <p className="muted">Інгредієнти не вказано.</p>
        )}

      </section>



      <section className="contentBlock">

        <h2 className="contentBlockTitle fontSerif">Інструкції</h2>

        <p className="pre">{recipe.instructions}</p>

      </section>



      <section className="contentBlock">

        <h2 className="contentBlockTitle fontSerif">Коментарі</h2>

        {auth.isAuthenticated ? (

          <div className="commentForm">

            <textarea

              value={commentBody}

              onChange={(e) => setCommentBody(e.target.value)}

              rows={3}

              placeholder="Ваш коментар…"

            />

            <button className="btn" onClick={submitComment} disabled={busy || !commentBody.trim()} type="button">

              Додати

            </button>

          </div>

        ) : (

          <p className="muted">

            Щоб залишати коментарі, потрібно <Link to="/login">увійти</Link>.

          </p>

        )}



        <div className="commentList">

          {comments.map((c) => {

            const canManage = auth.isAuthenticated && (auth.user?.is_admin || auth.user?.id === c.author?.id);
            const isEditing = editingCommentId === c.id;

            return (

              <div key={c.id} className="commentItem">

                <div className="commentItemHeader">

                  <div className="commentAvatar">

                    {c.author?.avatar_url ? (

                      <img src={resolveAssetUrl(c.author.avatar_url)} alt="" />

                    ) : null}

                  </div>

                  <div className="commentItemMeta">

                    <span className="muted" style={{ fontSize: '0.85rem' }}>

                      {c.author?.username ? <Link to={`/u/${c.author.username}`}>@{c.author.username}</Link> : '—'}

                    </span>

                    {c.created_at ? <span className="commentDate muted">{formatCommentDate(c.created_at)}</span> : null}

                  </div>

                  {canManage ? (

                    <div className="commentItemActions">

                      {!isEditing ? (

                        <button
                          className="btn btnSecondary btnSmall"
                          onClick={() => startEditComment(c)}
                          disabled={busy}
                          type="button"
                        >
                          Редагувати
                        </button>
                      ) : null}

                      <button

                        className="btn btnDanger btnSmall"

                        onClick={() => deleteComment(c.id)}

                        disabled={busy}

                        type="button"

                      >

                        Видалити

                      </button>

                    </div>

                  ) : null}

                </div>

                {isEditing ? (
                  <div className="commentEditForm">
                    <textarea
                      value={editCommentBody}
                      onChange={(e) => setEditCommentBody(e.target.value)}
                      rows={3}
                    />
                    <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                      <button
                        className="btn btnSmall"
                        type="button"
                        disabled={busy || !editCommentBody.trim()}
                        onClick={() => saveEditComment(c.id)}
                      >
                        Зберегти
                      </button>
                      <button
                        className="btn btnSecondary btnSmall"
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditCommentBody('');
                        }}
                      >
                        Скасувати
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="pre">{c.body}</p>
                )}

              </div>

            );

          })}

          {!comments.length ? <p className="muted">Коментарів поки немає.</p> : null}

        </div>

      </section>

    </article>

  );

}


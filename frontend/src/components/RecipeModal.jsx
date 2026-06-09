import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch, resolveAssetUrl } from '../api/client';
import { StarRating } from './StarRating';
import { useAuth } from '../state/auth';
import { formatIngredientDisplay } from '../utils/ingredients';

export function RecipeModal({ recipeId, onClose }) {
  const auth = useAuth();
  const [recipe, setRecipe] = useState(null);
  const [saved, setSaved] = useState(false);
  const [inShoppingList, setInShoppingList] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch(`/recipes/${recipeId}`, { auth: auth.isAuthenticated });
        if (cancelled) return;
        setRecipe(data.recipe);

        if (auth.isAuthenticated) {
          const [savedList, shopping] = await Promise.all([
            apiFetch('/users/me/saved', { auth: true }),
            apiFetch('/shopping-list', { auth: true }),
          ]);
          if (cancelled) return;
          setSaved((savedList.items || []).some((r) => r.id === recipeId));
          setInShoppingList((shopping.recipes || []).some((r) => r.id === recipeId));
        } else {
          setSaved(false);
          setInShoppingList(false);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || 'Не вдалося завантажити рецепт');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (Number.isFinite(recipeId)) load();
    return () => {
      cancelled = true;
    };
  }, [recipeId, auth.isAuthenticated]);

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
      setError(e.message || 'Не вдалося оновити улюблені');
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

  return (
    <div className="modalOverlay" role="presentation" onClick={onClose}>
      <div
        className="modalPanel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <h2 id="recipe-modal-title" className="modalTitle fontSerif">
            {recipe?.title || 'Деталі рецепту'}
          </h2>
          <button type="button" className="btn btnSecondary btnSmall modalClose" onClick={onClose} aria-label="Закрити">
            ×
          </button>
        </div>

        <div className="modalBody">
          {loading ? <p className="muted">Завантаження…</p> : null}
          {error ? <div className="alert">{error}</div> : null}

          {recipe ? (
            <>
              {recipe.image_url ? (
                <div className="modalImageWrap">
                  <img className="modalImage" src={resolveAssetUrl(recipe.image_url)} alt={recipe.title} />
                </div>
              ) : (
                <div className="modalImageWrap">
                  <div className="detailImagePlaceholder" aria-hidden="true" />
                </div>
              )}

              <div className="pillRow">
                <span className="pill">{recipe.category?.name || 'Без категорії'}</span>
                <span className="pill pillSoft">{recipe.cooking_time} хв</span>
                <span className="pill pillSoft">
                  {recipe.owner?.username ? (
                    <>
                      Автор:{' '}
                      <Link to={`/u/${recipe.owner.username}`} onClick={onClose}>
                        @{recipe.owner.username}
                      </Link>
                    </>
                  ) : (
                    'Автор: —'
                  )}
                </span>
              </div>

              <StarRating
                ratingAvg={recipe.rating_avg}
                ratingCount={recipe.rating_count}
                compact={false}
              />

              <div className="row" style={{ flexWrap: 'wrap' }}>
                {auth.isAuthenticated ? (
                  <>
                    <button
                      className={saved ? 'btn btnSecondary' : 'btn'}
                      onClick={toggleSaved}
                      disabled={busy}
                      type="button"
                    >
                      {saved ? 'У улюблених' : 'Додати в улюблені'}
                    </button>
                    <button
                      className={inShoppingList ? 'btn btnSecondary' : 'btn'}
                      onClick={toggleShoppingList}
                      disabled={busy}
                      type="button"
                    >
                      {inShoppingList ? 'У списку' : 'До списку покупок'}
                    </button>
                  </>
                ) : (
                  <Link className="btn btnSecondary" to="/login" onClick={onClose}>
                    Увійти, щоб зберегти
                  </Link>
                )}
                <Link className="btn" to={`/recipes/${recipe.id}`} onClick={onClose}>
                  Повна сторінка
                </Link>
              </div>

              <div className="modalSection contentBlock" style={{ margin: 0 }}>
                <h3 className="contentBlockTitle fontSerif" style={{ marginTop: 0 }}>
                  Опис
                </h3>
                <p className="pre">{recipe.description}</p>
              </div>
              <div className="modalSection contentBlock" style={{ margin: 0 }}>
                <h3 className="contentBlockTitle fontSerif" style={{ marginTop: 0 }}>
                  Інгредієнти
                </h3>
                {Array.isArray(recipe.ingredients) && recipe.ingredients.length ? (
                  <ul className="ingredientDisplayList">
                    {recipe.ingredients.map((item, index) => (
                      <li key={index}>{formatIngredientDisplay(item)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted">Інгредієнти не вказано.</p>
                )}
              </div>
              <div className="modalSection contentBlock" style={{ margin: 0 }}>
                <h3 className="contentBlockTitle fontSerif" style={{ marginTop: 0 }}>
                  Інструкції
                </h3>
                <p className="pre">{recipe.instructions}</p>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

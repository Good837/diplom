import React, { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { apiFetch } from '../api/client';
import { useAuth } from '../state/auth';

const CHECKED_KEY = 'tastyhub_shopping_checked';

function loadChecked() {
  try {
    const raw = localStorage.getItem(CHECKED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveChecked(map) {
  localStorage.setItem(CHECKED_KEY, JSON.stringify(map));
}

export function ShoppingList() {
  const auth = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [recipes, setRecipes] = useState([]);
  const [items, setItems] = useState([]);
  const [checked, setChecked] = useState(loadChecked);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await apiFetch('/shopping-list', { auth: true });
      setRecipes(data.recipes || []);
      setItems(data.items || []);
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити список покупок');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) load();
  }, [auth.isAuthenticated, load]);

  function toggleChecked(text) {
    setChecked((prev) => {
      const next = { ...prev, [text]: !prev[text] };
      saveChecked(next);
      return next;
    });
  }

  async function removeRecipe(id) {
    setBusy(true);
    setError('');
    try {
      await apiFetch(`/shopping-list/recipes/${id}`, { method: 'DELETE', auth: true });
      await load();
    } catch (e) {
      setError(e.message || 'Не вдалося прибрати рецепт');
    } finally {
      setBusy(false);
    }
  }

  async function clearList() {
    if (!window.confirm('Очистити весь список покупок?')) return;
    setBusy(true);
    setError('');
    try {
      await apiFetch('/shopping-list', { method: 'DELETE', auth: true });
      setChecked({});
      saveChecked({});
      await load();
    } catch (e) {
      setError(e.message || 'Не вдалося очистити список');
    } finally {
      setBusy(false);
    }
  }

  if (!auth.loading && !auth.isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <header className="catalogPageHeader">
        <h1 className="catalogPageTitle fontSerif">Список покупок</h1>
        <p className="catalogPageSubtitle muted">
          Додайте рецепти — інгредієнти зберуться в один зведений список
        </p>
      </header>

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <p className="muted">Завантаження…</p> : null}

      {!loading ? (
        <div className="shoppingLayout">
          <section className="contentBlock shoppingRecipes">
            <div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <h2 className="contentBlockTitle fontSerif" style={{ margin: 0 }}>
                Обрані рецепти ({recipes.length})
              </h2>
              {recipes.length ? (
                <button className="btn btnDanger btnSmall" type="button" onClick={clearList} disabled={busy}>
                  Очистити список
                </button>
              ) : null}
            </div>
            {recipes.length ? (
              <ul className="shoppingRecipeList">
                {recipes.map((r) => (
                  <li key={r.id} className="shoppingRecipeItem">
                    <Link to={`/recipes/${r.id}`}>{r.title}</Link>
                    <button
                      className="btn btnSecondary btnSmall"
                      type="button"
                      disabled={busy}
                      onClick={() => removeRecipe(r.id)}
                    >
                      Прибрати
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">
                Список порожній. На сторінці рецепта натисніть «До списку покупок» або перейдіть до{' '}
                <Link to="/">каталогу</Link>.
              </p>
            )}
          </section>

          <section className="contentBlock shoppingItems">
            <h2 className="contentBlockTitle fontSerif">Зведені інгредієнти</h2>
            {items.length ? (
              <ul className="shoppingIngredientList">
                {items.map((item) => (
                  <li key={item.text} className="shoppingIngredientItem">
                    <button
                      type="button"
                      className={`shoppingIngredientToggle ${checked[item.text] ? 'isDone' : ''}`}
                      onClick={() => toggleChecked(item.text)}
                      aria-pressed={Boolean(checked[item.text])}
                    >
                      {item.text}
                    </button>
                    {item.count > 1 || (item.sources && item.sources.length > 1) ? (
                      <span className="muted shoppingIngredientMeta">
                        ×{item.count}
                        {item.sources?.length ? ` (${item.sources.join(', ')})` : ''}
                      </span>
                    ) : item.sources?.length === 1 ? (
                      <span className="muted shoppingIngredientMeta">({item.sources[0]})</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Додайте рецепти, щоб зібрати інгредієнти.</p>
            )}
          </section>
        </div>
      ) : null}
    </div>
  );
}

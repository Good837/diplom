import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { apiFetch } from '../api/client';
import { RecipeCard } from '../components/RecipeCard';
import { RecipeModal } from '../components/RecipeModal';
import { useAuth } from '../state/auth';

export function Favorites() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [saved, setSaved] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalRecipeId, setModalRecipeId] = useState(null);

  useEffect(() => {
    if (!auth.loading && !auth.isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [auth.loading, auth.isAuthenticated, navigate]);

  useEffect(() => {
    if (!auth.isAuthenticated) return undefined;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch('/users/me/saved', { auth: true });
        if (!cancelled) setSaved(data.items || []);
      } catch (e) {
        if (!cancelled) setError(e.message || 'Не вдалося завантажити улюблені');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [auth.isAuthenticated]);

  if (auth.loading || !auth.isAuthenticated) {
    return <p className="muted">Завантаження…</p>;
  }

  return (
    <div>
      <header className="catalogPageHeader">
        <h1 className="catalogPageTitle fontSerif">Улюблені</h1>
        <p className="catalogPageSubtitle muted">
          Рецепти, які ви зберегли на сервері — доступні з будь-якого пристрою.
        </p>
      </header>

      {error ? <div className="alert">{error}</div> : null}
      {loading ? <p className="muted">Завантаження…</p> : null}

      {!loading && saved.length ? (
        <div className="gridCards">
          {saved.map((r) => (
            <RecipeCard key={r.id} recipe={r} onOpenDetails={setModalRecipeId} variant="catalog" />
          ))}
        </div>
      ) : null}

      {!loading && !saved.length ? (
        <div className="card">
          <p className="muted">Поки що немає улюблених рецептів.</p>
          <Link className="btn" to="/">
            Переглянути каталог
          </Link>
        </div>
      ) : null}

      {modalRecipeId ? <RecipeModal recipeId={modalRecipeId} onClose={() => setModalRecipeId(null)} /> : null}
    </div>
  );
}

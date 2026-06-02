import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { apiFetch, resolveAssetUrl } from '../api/client';

export function UserProfile() {
  const { username } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch(`/users/${encodeURIComponent(username)}`);
        setUser(data.user);
        setRecipes(data.recipes || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити профіль');
      } finally {
        setLoading(false);
      }
    }
    if (username) load();
  }, [username]);

  if (loading) return <p className="muted">Завантаження…</p>;
  if (error) return <div className="alert">{error}</div>;
  if (!user) return <div className="alert">Користувача не знайдено</div>;

  return (
    <div>
      <section className="profileHero">
        <div className="profileHeroInner">
          <div className="profileHeroMedia">
            <div className="profileBlob profileBlobA" aria-hidden="true" />
            <div className="profileBlob profileBlobB" aria-hidden="true" />

            <div className="profileAvatar">
              {user.avatar_url ? (
                <img src={resolveAssetUrl(user.avatar_url)} alt="Аватарка" />
              ) : (
                <div className="profileAvatarPlaceholder" aria-hidden="true" />
              )}
            </div>
          </div>

          <div className="profileHeroCopy">
            <div className="breadcrumbs">
              <Link to="/">Головна</Link> <span className="muted">/</span> <span>Профіль</span>
            </div>

            <h1 className="profileTitle">{user.display_name || `@${user.username}`}</h1>
            <div className="pillRow">
              <span className="pill pillSoft">@{user.username}</span>
              <span className="pill pillSoft">Рецептів: {recipes.length}</span>
            </div>
            <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
              {user.bio || 'Опису поки немає.'}
            </p>
          </div>
        </div>
      </section>

      <div className="card">
        <h2>Рецепти користувача</h2>
        {recipes.length ? (
          <div className="gridCards">
            {recipes.map((r) => (
              <div key={r.id} className="card" style={{ margin: 0 }}>
                <h3 className="cardTitle" style={{ margin: 0 }}>
                  <Link to={`/recipes/${r.id}`}>{r.title}</Link>
                </h3>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  {r.category?.name || 'Без категорії'} • {r.cooking_time} хв
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Поки що немає рецептів.</p>
        )}
      </div>
    </div>
  );
}


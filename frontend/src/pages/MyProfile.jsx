import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import { apiFetch, apiFetchFormData, resolveAssetUrl } from '../api/client';
import { useAuth } from '../state/auth';

export function MyProfile() {
  const auth = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');

  const [myRecipes, setMyRecipes] = useState([]);
  const [saved, setSaved] = useState([]);

  const avatarUrl = resolveAssetUrl(auth.user?.avatar_url || '');

  const canSave = useMemo(() => {
    return username.trim().length > 0 && displayName.trim().length > 0;
  }, [username, displayName]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [meData, myList, savedList] = await Promise.all([
          apiFetch('/users/me', { auth: true }),
          apiFetch('/recipes?owner=me', { auth: true }),
          apiFetch('/users/me/saved', { auth: true }),
        ]);
        auth.setUser(meData.user);
        setDisplayName(meData.user?.display_name || '');
        setUsername(meData.user?.username || '');
        setBio(meData.user?.bio || '');
        setMyRecipes(myList.items || []);
        setSaved(savedList.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити профіль');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile() {
    if (!canSave) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const data = await apiFetch('/users/me', {
        method: 'PUT',
        auth: true,
        body: {
          display_name: displayName.trim(),
          username: username.trim(),
          bio: bio,
        },
      });
      auth.setUser(data.user);
      setMessage('Профіль оновлено');
    } catch (e) {
      setError(e.message || 'Не вдалося зберегти профіль');
    } finally {
      setBusy(false);
    }
  }

  async function uploadAvatar(file) {
    if (!file) return;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const data = await apiFetchFormData('/uploads/avatar', { auth: true, formData: fd });
      const nextUser = { ...(auth.user || {}), avatar_url: data.avatar_url };
      auth.setUser(nextUser);
      setMessage('Аватарку оновлено');
    } catch (e) {
      setError(e.message || 'Не вдалося завантажити аватарку');
    } finally {
      setBusy(false);
    }
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="card narrow">
        <h1>Профіль</h1>
        <p className="muted">
          Потрібно <Link to="/login">увійти</Link>, щоб переглядати профіль.
        </p>
      </div>
    );
  }

  if (loading) return <p className="muted">Завантаження…</p>;

  return (
    <div>
      <section className="profileHero">
        <div className="profileHeroInner">
          <div className="profileHeroMedia">
            <div className="profileBlob profileBlobA" aria-hidden="true" />
            <div className="profileBlob profileBlobB" aria-hidden="true" />

            <div className="profileAvatar">
              {avatarUrl ? <img src={avatarUrl} alt="Аватарка" /> : <div className="profileAvatarPlaceholder" aria-hidden="true" />}
            </div>

            <label className="profileUpload">
              <input
                type="file"
                accept="image/*"
                disabled={busy}
                onChange={(e) => uploadAvatar(e.target.files && e.target.files[0])}
              />
              <span className="muted">Завантажити аватарку</span>
            </label>
          </div>

          <div className="profileHeroCopy">
            <h1 className="profileTitle">{auth.user?.display_name || 'Мій профіль'}</h1>
            <div className="pillRow">
              <span className="pill pillSoft">@{auth.user?.username || '—'}</span>
              {auth.user?.is_admin ? <span className="pill">Адміністратор</span> : null}
              <span className="pill pillSoft">Рецептів: {myRecipes.length}</span>
              <span className="pill pillSoft">Збережено: {saved.length}</span>
            </div>
            <p className="muted" style={{ marginTop: 10, marginBottom: 0 }}>
              {bio ? bio : 'Додайте короткий опис про себе — він буде видимий у вашому профілі.'}
            </p>
          </div>
        </div>
      </section>

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      <div className="card">
        <h2>Дані профілю</h2>
        <div className="form">
          <label className="field">
            <span className="label">Ім’я (будь‑яке)</span>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Напр., Олена" />
          </label>

          <label className="field">
            <span className="label">Ім’я користувача (унікальне)</span>
            <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Напр., olena" />
          </label>

          <label className="field">
            <span className="label">Опис</span>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Коротко про себе…" />
          </label>

          <div className="row">
            <button className="btn" onClick={saveProfile} disabled={busy || !canSave}>
              {busy ? 'Збереження…' : 'Зберегти'}
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Мої рецепти</h2>
        {myRecipes.length ? (
          <div className="gridCards">
            {myRecipes.map((r) => (
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

      <div className="card">
        <h2>Збережені рецепти</h2>
        {saved.length ? (
          <div className="gridCards">
            {saved.map((r) => (
              <div key={r.id} className="card" style={{ margin: 0 }}>
                <h3 className="cardTitle" style={{ margin: 0 }}>
                  <Link to={`/recipes/${r.id}`}>{r.title}</Link>
                </h3>
                <p className="muted" style={{ margin: '6px 0 0' }}>
                  {r.category?.name || 'Без категорії'} • {r.cooking_time} хв • Автор: @{r.owner?.username || '—'}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="muted">Тут з’являться рецепти, які ви збережете.</p>
        )}
      </div>
    </div>
  );
}


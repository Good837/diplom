import React, { useEffect, useState } from 'react';

import { Link } from 'react-router-dom';

import { apiFetch, apiFetchFormData } from '../api/client';
import { ProfileActivityTabs } from '../components/ProfileActivityTabs';
import { ProfileBanner } from '../components/ProfileBanner';
import { ProfileEditModal } from '../components/ProfileEditModal';
import { useAuth } from '../state/auth';

export function MyProfile() {
  const auth = useAuth();
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [myRecipes, setMyRecipes] = useState([]);
  const [saved, setSaved] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const [meData, myList, savedList, commentsList] = await Promise.all([
          apiFetch('/users/me', { auth: true }),
          apiFetch('/recipes?owner=me', { auth: true }),
          apiFetch('/users/me/saved', { auth: true }),
          apiFetch('/users/me/comments', { auth: true }),
        ]);
        auth.setUser(meData.user);
        setMyRecipes(myList.items || []);
        setSaved(savedList.items || []);
        setComments(commentsList.items || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити профіль');
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function saveProfile(payload) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      if (payload.avatar_file) {
        const fd = new FormData();
        fd.append('file', payload.avatar_file);
        const uploaded = await apiFetchFormData('/uploads/avatar', { auth: true, formData: fd });
        auth.setUser({ ...(auth.user || {}), avatar_url: uploaded.avatar_url });
      }

      const data = await apiFetch('/users/me', {
        method: 'PUT',
        auth: true,
        body: {
          display_name: payload.display_name,
          username: payload.username,
          bio: payload.bio,
          is_private: payload.is_private,
        },
      });

      auth.setUser(data.user);
      setMessage('Профіль оновлено');
      setEditing(false);
    } catch (e) {
      setError(e.message || 'Не вдалося зберегти профіль');
    } finally {
      setBusy(false);
    }
  }

  if (!auth.isAuthenticated) {
    return (
      <div className="authPage">
        <div className="card narrow">
          <h1 className="fontSerif">Профіль</h1>
          <p className="muted">
            Потрібно <Link to="/login">увійти</Link>, щоб переглядати профіль.
          </p>
        </div>
      </div>
    );
  }

  if (loading) return <p className="muted">Завантаження…</p>;

  const profilePills = [
    {
      label: auth.user?.is_private ? 'Приватний' : 'Публічний',
      className: auth.user?.is_private ? 'pill' : 'pill pillSoft',
    },
    ...(auth.user?.is_admin ? [{ label: 'Адміністратор', className: 'pill' }] : []),
    { label: `Рецептів: ${myRecipes.length}`, className: 'pill pillSoft' },
    { label: `Збережено: ${saved.length}`, className: 'pill pillSoft' },
  ];

  const bio =
    auth.user?.bio || 'Додайте короткий опис про себе — він буде видимий у вашому публічному профілі.';

  return (
    <div>
      <header className="catalogPageHeader">
        <h1 className="catalogPageTitle fontSerif">Мій профіль</h1>
      </header>

      <ProfileBanner
        displayName={auth.user?.display_name || 'Мій профіль'}
        username={auth.user?.username}
        bio={bio}
        avatarUrl={auth.user?.avatar_url}
        pills={profilePills}
        onEdit={() => setEditing(true)}
      />

      {error ? <div className="alert">{error}</div> : null}
      {message ? <div className="success">{message}</div> : null}

      {editing ? (
        <ProfileEditModal
          user={auth.user}
          busy={busy}
          onClose={() => !busy && setEditing(false)}
          onSave={saveProfile}
        />
      ) : null}

      <ProfileActivityTabs
        recipes={myRecipes}
        saved={saved}
        comments={comments}
        isOwnProfile
      />
    </div>
  );
}

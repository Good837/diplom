import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';

import { apiFetch } from '../api/client';
import { ProfileActivityTabs } from '../components/ProfileActivityTabs';
import { ProfileBanner } from '../components/ProfileBanner';
import { useAuth } from '../state/auth';
import { formatMemberSince } from '../utils/formatDate';

export function UserProfile() {
  const auth = useAuth();
  const { username } = useParams();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [recipes, setRecipes] = useState([]);
  const [saved, setSaved] = useState([]);
  const [comments, setComments] = useState([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const data = await apiFetch(`/users/${encodeURIComponent(username)}`, { auth: true });
        setUser(data.user);
        setRecipes(data.recipes || []);
        setSaved(data.saved || []);
        setComments(data.comments || []);
      } catch (e) {
        setError(e.message || 'Не вдалося завантажити профіль');
      } finally {
        setLoading(false);
      }
    }
    if (username) load();
  }, [username]);

  const isOwner = useMemo(
    () => auth.isAuthenticated && user && auth.user?.id === user.id,
    [auth.isAuthenticated, auth.user?.id, user]
  );

  const contentHidden = useMemo(
    () => Boolean(user?.is_private && !isOwner),
    [user?.is_private, isOwner]
  );

  if (loading) return <p className="muted">Завантаження…</p>;
  if (error) return <div className="alert">{error}</div>;
  if (!user) return <div className="alert">Користувача не знайдено</div>;

  const breadcrumbs = (
    <>
      <Link to="/">Каталог</Link>
      <span className="muted">/</span>
      <span>@{user.username}</span>
    </>
  );

  const pills = [
    ...(contentHidden
      ? []
      : [
          { label: `Рецептів: ${user.recipe_count ?? recipes.length}`, className: 'pill pillSoft' },
          { label: `Улюблених: ${user.saved_count ?? saved.length}`, className: 'pill pillSoft' },
          { label: `Коментарів: ${user.comment_count ?? comments.length}`, className: 'pill pillSoft' },
        ]),
    ...(user.member_since
      ? [{ label: `На сайті з ${formatMemberSince(user.member_since)}`, className: 'pill pillSoft' }]
      : []),
  ];

  return (
    <div>
      <ProfileBanner
        displayName={user.display_name || user.username}
        username={user.username}
        bio={user.bio || 'Опису поки немає.'}
        avatarUrl={user.avatar_url}
        breadcrumbs={breadcrumbs}
        pills={pills}
        showPrivacyBadge={contentHidden}
      />

      {contentHidden ? (
        <p className="muted profilePrivateNotice">
          Цей користувач обмежив видимість активності в профілі.
        </p>
      ) : (
        <ProfileActivityTabs
          key={user.username}
          recipes={recipes}
          saved={saved}
          comments={comments}
        />
      )}
    </div>
  );
}

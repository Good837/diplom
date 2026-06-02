import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';

import { resolveAssetUrl } from '../api/client';
import { useAuth } from '../state/auth';

export function Layout() {
  const auth = useAuth();
  const navigate = useNavigate();

  return (
    <div className="appShell">
      <header className="header">
        <div className="container headerRow">
          <Link className="brand" to="/">
            TastyHub
          </Link>

          <nav className="nav">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')}>
              Головна
            </NavLink>
            {auth.isAuthenticated ? (
              <NavLink to="/me" className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')}>
                Профіль
              </NavLink>
            ) : null}
            {auth.isAuthenticated && auth.user?.is_admin ? (
              <NavLink to="/admin" className={({ isActive }) => (isActive ? 'navLink active' : 'navLink')}>
                Адмін
              </NavLink>
            ) : null}
          </nav>

          <div className="headerActions">
            {auth.loading ? (
              <span className="muted">Завантаження…</span>
            ) : auth.isAuthenticated ? (
              <>
                <Link className="headerAvatar" to="/me" title={auth.user?.username ? `@${auth.user.username}` : 'Профіль'}>
                  {auth.user?.avatar_url ? (
                    <img src={resolveAssetUrl(auth.user.avatar_url)} alt="Аватарка" />
                  ) : (
                    <span className="headerAvatarFallback" aria-hidden="true">
                      {(auth.user?.username || '?').slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </Link>
                <button
                  className="btn btnSecondary"
                  onClick={() => {
                    auth.logout();
                    navigate('/');
                  }}
                >
                  Вийти
                </button>
              </>
            ) : (
              <>
                <Link className="btn btnSecondary" to="/login">
                  Увійти
                </Link>
                <Link className="btn" to="/register">
                  Реєстрація
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container main">
        <Outlet />
      </main>

      <footer className="footer">
        <div className="container muted">© {new Date().getFullYear()} TastyHub</div>
      </footer>
    </div>
  );
}


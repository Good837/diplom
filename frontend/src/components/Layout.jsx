import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';

import { resolveAssetUrl } from '../api/client';
import { useAuth } from '../state/auth';

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

function navLinkClass(isActive) {
  return isActive ? 'navLink active' : 'navLink';
}

export function Layout() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [searchOpen, setSearchOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [avatarFailed, setAvatarFailed] = useState(false);
  const [searchDraft, setSearchDraft] = useState(() => searchParams.get('q') || '');

  useEffect(() => {
    setAvatarFailed(false);
  }, [auth.user?.avatar_url]);

  useEffect(() => {
    if (!searchOpen) setSearchDraft(searchParams.get('q') || '');
  }, [searchParams, searchOpen]);

  useEffect(() => {
    if (!navOpen) return undefined;

    function onKeyDown(e) {
      if (e.key === 'Escape') setNavOpen(false);
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [navOpen]);

  function closeNav() {
    setNavOpen(false);
  }

  function submitSearch(e) {
    e.preventDefault();
    const q = searchDraft.trim();
    const next = new URLSearchParams(searchParams);
    if (q) next.set('q', q);
    else next.delete('q');
    navigate({ pathname: '/', search: next.toString() ? `?${next.toString()}` : '' });
    setSearchOpen(false);
  }

  return (
    <div className="appShell">
      <header className="header">
        <div className="container headerRow">
          <Link className="brand" to="/" onClick={closeNav}>
            <img className="brandIcon" src="/favicon.png" alt="" width="32" height="32" />
            TastyHub
          </Link>

          <nav className={`nav headerNavDrawer${navOpen ? ' isOpen' : ''}`} id="header-nav" aria-label="Головна навігація">
            <NavLink to="/" end className={({ isActive }) => navLinkClass(isActive)} onClick={closeNav}>
              Головна
            </NavLink>
            {auth.isAuthenticated ? (
              <>
                <NavLink to="/favorites" className={({ isActive }) => navLinkClass(isActive)} onClick={closeNav}>
                  Улюблені
                </NavLink>
                <NavLink to="/shopping-list" className={({ isActive }) => navLinkClass(isActive)} onClick={closeNav}>
                  Список покупок
                </NavLink>
                <NavLink to="/me" className={({ isActive }) => navLinkClass(isActive)} onClick={closeNav}>
                  Профіль
                </NavLink>
              </>
            ) : null}
            {auth.isAuthenticated && auth.user?.is_admin ? (
              <NavLink to="/admin" className={({ isActive }) => navLinkClass(isActive)} onClick={closeNav}>
                Адмін
              </NavLink>
            ) : null}
          </nav>

          <div className="headerActionsBar">
            <button
              type="button"
              className="headerMenuBtn"
              aria-expanded={navOpen}
              aria-controls="header-nav"
              aria-label={navOpen ? 'Закрити меню' : 'Відкрити меню'}
              onClick={() => setNavOpen((open) => !open)}
            >
              {navOpen ? <CloseIcon /> : <MenuIcon />}
            </button>

            <div className="headerActions">
              <div className="headerSearchWrap">
                {searchOpen ? (
                  <form className="headerSearchForm" onSubmit={submitSearch}>
                    <input
                      className="headerSearchInput"
                      type="search"
                      value={searchDraft}
                      onChange={(e) => setSearchDraft(e.target.value)}
                      placeholder="Пошук рецептів…"
                      aria-label="Пошук рецептів"
                      autoFocus
                    />
                    <button type="submit" className="headerSearchBtn" aria-label="Шукати">
                      <SearchIcon />
                    </button>
                  </form>
                ) : (
                  <button
                    type="button"
                    className="headerSearchBtn"
                    aria-label="Відкрити пошук"
                    onClick={() => {
                      setSearchDraft(searchParams.get('q') || '');
                      setSearchOpen(true);
                    }}
                  >
                    <SearchIcon />
                  </button>
                )}
              </div>

              {auth.loading ? (
                <span className="muted">Завантаження…</span>
              ) : auth.isAuthenticated ? (
                <>
                  <Link className="headerAvatar" to="/me" title={auth.user?.username ? `@${auth.user.username}` : 'Профіль'}>
                    {auth.user?.avatar_url && !avatarFailed ? (
                      <img
                        src={resolveAssetUrl(auth.user.avatar_url)}
                        alt="Аватарка"
                        onError={() => setAvatarFailed(true)}
                      />
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
        </div>

        {navOpen ? (
          <button
            type="button"
            className="headerNavOverlay"
            aria-label="Закрити меню"
            onClick={closeNav}
          />
        ) : null}
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

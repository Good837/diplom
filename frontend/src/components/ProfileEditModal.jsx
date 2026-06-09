import React, { useEffect, useMemo, useState } from 'react';

import { resolveAssetUrl } from '../api/client';

export function ProfileEditModal({ user, busy, onClose, onSave }) {
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarFile, setAvatarFile] = useState(null);
  const [isPrivate, setIsPrivate] = useState(false);

  useEffect(() => {
    setDisplayName(user?.display_name || '');
    setUsername(user?.username || '');
    setBio(user?.bio || '');
    setIsPrivate(Boolean(user?.is_private));
    setAvatarFile(null);
  }, [user]);

  const canSave = useMemo(
    () => username.trim().length > 0 && displayName.trim().length > 0,
    [username, displayName]
  );

  const [avatarPreview, setAvatarPreview] = useState('');

  useEffect(() => {
    if (avatarFile) {
      const url = URL.createObjectURL(avatarFile);
      setAvatarPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarPreview(user?.avatar_url ? resolveAssetUrl(user.avatar_url) : '');
    return undefined;
  }, [avatarFile, user?.avatar_url]);

  return (
    <div className="modalOverlay" role="presentation" onClick={() => !busy && onClose()}>
      <div
        className="modalPanel modalPanelForm"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-edit-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modalHeader">
          <h2 id="profile-edit-title" className="modalTitle fontSerif">
            Редагування профілю
          </h2>
          <button
            type="button"
            className="btn btnSecondary btnSmall modalClose"
            onClick={onClose}
            disabled={busy}
            aria-label="Закрити"
          >
            ×
          </button>
        </div>

        <div className="modalBody">
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canSave || busy) return;
              onSave({
                display_name: displayName.trim(),
                username: username.trim(),
                bio,
                is_private: isPrivate,
                avatar_file: avatarFile || undefined,
              });
            }}
          >
            <div className="profileEditAvatarRow">
              <div className="profileEditAvatar">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="" />
                ) : (
                  <div className="profileBannerAvatarPlaceholder" aria-hidden="true" />
                )}
              </div>
              <label className="field" style={{ flex: 1 }}>
                <span className="label">Фото профілю</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  disabled={busy}
                  onChange={(e) => setAvatarFile((e.target.files && e.target.files[0]) || null)}
                />
                <span className="hint">JPG/PNG/GIF/WEBP, до 5 МБ.</span>
              </label>
            </div>

            <label className="field">
              <span className="label">Ім’я (будь‑яке)</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Напр., Олена"
                maxLength={120}
              />
            </label>

            <label className="field">
              <span className="label">Ім’я користувача (унікальне)</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Напр., olena"
                maxLength={50}
              />
            </label>

            <label className="field">
              <span className="label">Опис</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={4}
                placeholder="Коротко про себе…"
              />
            </label>

            <div className={`privacySetting ${isPrivate ? 'isPrivate' : ''}`}>
              <div className="privacySettingText">
                <span className="privacySettingTitle">Приватний профіль</span>
                <span className="hint">
                  Інші користувачі не бачитимуть ваші рецепти, улюблені та коментарі в профілі. Коментарі під
                  рецептами залишаються видимими.
                </span>
              </div>
              <label className="privacyToggle" aria-label="Приватний профіль">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  disabled={busy}
                />
                <span className="privacyToggleTrack" aria-hidden="true">
                  <span className="privacyToggleThumb" />
                </span>
              </label>
            </div>

            <div className="row">
              <button className="btn" type="submit" disabled={busy || !canSave}>
                {busy ? 'Збереження…' : 'Зберегти'}
              </button>
              <button className="btn btnSecondary" type="button" onClick={onClose} disabled={busy}>
                Скасувати
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

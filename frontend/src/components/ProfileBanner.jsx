import React from 'react';
import { Link } from 'react-router-dom';

import { resolveAssetUrl } from '../api/client';

export function ProfileBanner({
  displayName,
  username,
  bio,
  avatarUrl,
  pills = [],
  breadcrumbs = null,
  showUpload = false,
  onUpload,
  uploadBusy = false,
  onEdit,
  showPrivacyBadge = false,
}) {
  const resolvedAvatar = avatarUrl ? resolveAssetUrl(avatarUrl) : '';

  return (
    <section className="profileBanner">
      {breadcrumbs ? <div className="breadcrumbs">{breadcrumbs}</div> : null}

      <div className="profileBannerInner">
        <div className="profileBannerMedia">
          <div className="profileBannerAvatar">
            {resolvedAvatar ? (
              <img src={resolvedAvatar} alt="" />
            ) : (
              <div className="profileBannerAvatarPlaceholder" aria-hidden="true" />
            )}
          </div>
          {showUpload ? (
            <label className="profileBannerUpload">
              <input
                type="file"
                accept="image/*"
                disabled={uploadBusy}
                onChange={(e) => onUpload?.(e.target.files && e.target.files[0])}
              />
              Змінити фото
            </label>
          ) : null}
        </div>

        <div className="profileBannerCopy">
          <h1 className="profileBannerTitle fontSerif">{displayName}</h1>
          {username ? (
            <p className="profileBannerUsername muted">@{username}</p>
          ) : null}
          {pills.length || showPrivacyBadge ? (
            <div className="pillRow">
              {showPrivacyBadge ? <span className="pill">Приватний профіль</span> : null}
              {pills.map((pill) => (
                <span key={pill.key || pill.label} className={pill.className || 'pill pillSoft'}>
                  {pill.href ? <Link to={pill.href}>{pill.label}</Link> : pill.label}
                </span>
              ))}
            </div>
          ) : null}
          {bio ? <p className="profileBannerBio">{bio}</p> : null}
          {onEdit ? (
            <button type="button" className="btn btnSecondary profileBannerEdit" onClick={onEdit}>
              Редагувати профіль
            </button>
          ) : null}
        </div>
      </div>
    </section>
  );
}

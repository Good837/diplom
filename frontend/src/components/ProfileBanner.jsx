import React from 'react';

import { AssetImage } from './AssetImage';

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
  return (
    <section className="profileBanner">
      {breadcrumbs ? <div className="breadcrumbs">{breadcrumbs}</div> : null}

      <div className="profileBannerInner">
        <div className="profileBannerMedia">
          <div className="profileBannerAvatar">
            <AssetImage
              url={avatarUrl}
              alt=""
              placeholderClassName="profileBannerAvatarPlaceholder"
            />
          </div>
          {showUpload ? (
            <label className="profileBannerUpload">
              <input
                type="file"
                accept="image/*"
                disabled={uploadBusy}
                onChange={(e) => onUpload?.(e.target.files && e.target.files[0])}
              />
              {uploadBusy ? 'Завантаження…' : 'Змінити аватар'}
            </label>
          ) : null}
        </div>

        <div className="profileBannerBody">
          <h1 className="profileBannerTitle fontSerif">{displayName || username || 'Користувач'}</h1>
          {username ? <p className="profileBannerUsername muted">@{username}</p> : null}
          {bio ? <p className="profileBannerBio">{bio}</p> : null}
          {pills.length ? (
            <div className="pillRow">
              {pills.map((pill) => {
                const label = typeof pill === 'string' ? pill : pill.label;
                const className =
                  typeof pill === 'string' ? 'pill pillSoft' : pill.className || 'pill pillSoft';
                return (
                  <span key={label} className={className}>
                    {label}
                  </span>
                );
              })}
            </div>
          ) : null}
          {showPrivacyBadge ? <span className="pill pillSoft">Приватний профіль</span> : null}
        </div>

        {onEdit ? (
          <button type="button" className="btn btnSecondary" onClick={onEdit}>
            Редагувати профіль
          </button>
        ) : null}
      </div>
    </section>
  );
}

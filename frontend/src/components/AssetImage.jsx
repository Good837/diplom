import React, { useState } from 'react';

import { resolveAssetUrl } from '../api/client';

export function AssetImage({
  url,
  alt = '',
  className,
  placeholderClassName = 'recipeCardCatalogPlaceholder',
  placeholderAriaHidden = true,
  ...props
}) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return (
      <div
        className={placeholderClassName}
        aria-hidden={placeholderAriaHidden && !alt ? true : undefined}
        role={alt ? 'img' : undefined}
        aria-label={alt || undefined}
      />
    );
  }

  return (
    <img
      className={className}
      src={resolveAssetUrl(url)}
      alt={alt}
      onError={() => setFailed(true)}
      {...props}
    />
  );
}

import React, { useState } from 'react';

import { resolveAssetUrl } from '../api/client';

export function CommentAvatar({ url }) {
  const [failed, setFailed] = useState(false);

  if (!url || failed) {
    return <div className="commentAvatar" />;
  }

  return (
    <div className="commentAvatar">
      <img src={resolveAssetUrl(url)} alt="" onError={() => setFailed(true)} />
    </div>
  );
}

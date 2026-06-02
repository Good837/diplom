import React from 'react';
import { Link } from 'react-router-dom';

import { resolveAssetUrl } from '../api/client';

export function RecipeCard({ recipe }) {
  return (
    <div className="card">
      <div className="cardHeader">
        <h3 className="cardTitle">
          <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>
        </h3>
        <div className="cardMeta">
          <span>{recipe.category?.name || 'Без категорії'}</span>
          <span>•</span>
          <span>{recipe.cooking_time} хв</span>
        </div>
      </div>

      {recipe.image_url ? (
        <div className="thumbWrap">
          <img className="thumb" src={resolveAssetUrl(recipe.image_url)} alt={recipe.title} />
        </div>
      ) : null}

      <p className="cardText">{recipe.description}</p>

      <div className="cardFooter">
        <span className="muted">
          Автор:{' '}
          {recipe.owner?.username ? <Link to={`/u/${recipe.owner.username}`}>@{recipe.owner.username}</Link> : '—'}
        </span>
        <Link className="btn btnSmall" to={`/recipes/${recipe.id}`}>
          Деталі
        </Link>
      </div>
    </div>
  );
}


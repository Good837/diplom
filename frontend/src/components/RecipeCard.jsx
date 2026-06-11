import React from 'react';

import { Link } from 'react-router-dom';



import { resolveAssetUrl } from '../api/client';
import { getRecipeStatusLabel } from '../utils/recipeStatus';
import { StarRating } from './StarRating';



export function RecipeCard({ recipe, onOpenDetails, variant = 'catalog', showStatus = false }) {

  function openDetails(e) {

    e.preventDefault();

    if (onOpenDetails) onOpenDetails(recipe.id);

  }



  const statusBadge =
    showStatus && recipe.status && recipe.status !== 'approved' ? (
      <span className={`recipeStatusBadge recipeStatusBadge--${recipe.status}`}>
        {getRecipeStatusLabel(recipe.status)}
      </span>
    ) : null;

  if (variant === 'catalog') {

    const content = (

      <>

        <div className="recipeCardCatalogImgWrap">
          {statusBadge}

          {recipe.image_url ? (

            <img

              className="recipeCardCatalogImg"

              src={resolveAssetUrl(recipe.image_url)}

              alt={recipe.title}

            />

          ) : (

            <div className="recipeCardCatalogPlaceholder" aria-hidden="true" />

          )}

        </div>

        <h3 className="recipeCardCatalogTitle">{recipe.title}</h3>
        <StarRating
          ratingAvg={recipe.rating_avg}
          ratingCount={recipe.rating_count}
          compact
        />

      </>

    );



    if (onOpenDetails) {

      return (

        <button type="button" className="recipeCardCatalog" onClick={openDetails}>

          {content}

        </button>

      );

    }



    return (

      <Link className="recipeCardCatalog" to={`/recipes/${recipe.id}`}>

        {content}

      </Link>

    );

  }



  return (

    <div className="card">

      <div className="cardHeader">
        {statusBadge}

        <h3 className="cardTitle">

          {onOpenDetails ? (

            <button type="button" className="linkButton" onClick={openDetails}>

              {recipe.title}

            </button>

          ) : (

            <Link to={`/recipes/${recipe.id}`}>{recipe.title}</Link>

          )}

        </h3>

        <div className="cardMeta">

          <span>{recipe.category?.name || 'Без категорії'}</span>

          <span>•</span>

          <span>{recipe.cooking_time} хв</span>

        </div>
        <StarRating ratingAvg={recipe.rating_avg} ratingCount={recipe.rating_count} compact />

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

        {onOpenDetails ? (

          <button type="button" className="btn btnSmall" onClick={openDetails}>

            Деталі

          </button>

        ) : (

          <Link className="btn btnSmall" to={`/recipes/${recipe.id}`}>

            Деталі

          </Link>

        )}

      </div>

    </div>

  );

}


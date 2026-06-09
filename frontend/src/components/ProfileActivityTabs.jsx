import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  COMMENT_SORT_OPTIONS,
  RECIPE_SORT_OPTIONS,
  sortProfileComments,
  sortProfileRecipes,
} from '../utils/profileSort';
import { RecipeCard } from './RecipeCard';
import { formatCommentDate } from '../utils/formatDate';

const TABS = [
  { id: 'recipes', label: 'Рецепти' },
  { id: 'saved', label: 'Улюблені' },
  { id: 'comments', label: 'Коментарі' },
];

export function ProfileActivityTabs({
  recipes = [],
  saved = [],
  comments = [],
  isOwnProfile = false,
}) {
  const [tab, setTab] = useState('recipes');
  const [recipeSort, setRecipeSort] = useState('date_desc');
  const [commentSort, setCommentSort] = useState('date_desc');

  const sortedRecipes = useMemo(
    () => sortProfileRecipes(recipes, recipeSort),
    [recipes, recipeSort]
  );
  const sortedSaved = useMemo(() => sortProfileRecipes(saved, recipeSort), [saved, recipeSort]);
  const sortedComments = useMemo(
    () => sortProfileComments(comments, commentSort),
    [comments, commentSort]
  );

  const emptyMessages = {
    recipes: isOwnProfile
      ? 'Поки що немає рецептів. Створіть перший на головній сторінці.'
      : 'Поки що немає опублікованих рецептів.',
    saved: isOwnProfile
      ? 'Тут з’являться рецепти, які ви збережете.'
      : 'Улюблених рецептів поки немає.',
    comments: isOwnProfile ? 'Ви ще не залишали коментарів.' : 'Коментарів поки немає.',
  };

  const showRecipeSort = (tab === 'recipes' && recipes.length > 0) || (tab === 'saved' && saved.length > 0);
  const showCommentSort = tab === 'comments' && comments.length > 0;

  return (
    <div className="profileActivity">
      <div className="profileTabs" role="tablist" aria-label="Активність профілю">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'btn profileTabActive' : 'btn btnSecondary'}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {showRecipeSort ? (
        <div className="profileSortBar">
          <label className="profileSortLabel muted">
            Сортування
            <select
              className="profileSortSelect"
              value={recipeSort}
              onChange={(e) => setRecipeSort(e.target.value)}
              aria-label="Сортування рецептів"
            >
              {RECIPE_SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {showCommentSort ? (
        <div className="profileSortBar">
          <label className="profileSortLabel muted">
            Сортування
            <select
              className="profileSortSelect"
              value={commentSort}
              onChange={(e) => setCommentSort(e.target.value)}
              aria-label="Сортування коментарів"
            >
              {COMMENT_SORT_OPTIONS.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      <section className="profileSection" role="tabpanel">
        {tab === 'recipes' ? (
          recipes.length ? (
            <div className="gridCards">
              {sortedRecipes.map((r) => (
                <RecipeCard key={r.id} recipe={r} variant="catalog" />
              ))}
            </div>
          ) : (
            <p className="muted">{emptyMessages.recipes}</p>
          )
        ) : null}

        {tab === 'saved' ? (
          <>
            {isOwnProfile ? (
              <p className="profileTabHint muted">
                <Link to="/favorites">Переглянути всі улюблені →</Link>
              </p>
            ) : null}
            {saved.length ? (
              <div className="gridCards">
                {sortedSaved.map((r) => (
                  <RecipeCard key={r.id} recipe={r} variant="catalog" />
                ))}
              </div>
            ) : (
              <p className="muted">{emptyMessages.saved}</p>
            )}
          </>
        ) : null}

        {tab === 'comments' ? (
          comments.length ? (
            <div className="profileCommentList">
              {sortedComments.map((c) => (
                <div key={c.id} className="profileCommentItem">
                  <p className="profileCommentBody">{c.body}</p>
                  <div className="profileCommentMeta muted">
                    {c.recipe ? (
                      <Link to={`/recipes/${c.recipe.id}`}>{c.recipe.title}</Link>
                    ) : (
                      <span>Рецепт</span>
                    )}
                    {c.created_at ? <span>{formatCommentDate(c.created_at)}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">{emptyMessages.comments}</p>
          )
        ) : null}
      </section>
    </div>
  );
}

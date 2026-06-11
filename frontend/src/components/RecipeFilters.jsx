import React, { useMemo, useState } from 'react';

import { useMediaQuery } from '../utils/useMediaQuery';

const TIME_PRESETS = [
  { id: '', label: 'Будь-який час' },
  { id: 'under30', label: 'До 30 хв', min: null, max: 30 },
  { id: '30-60', label: '30–60 хв', min: 30, max: 60 },
  { id: 'over60', label: '60+ хв', min: 61, max: null },
];

const SORT_OPTIONS = [
  { id: 'newest', label: 'Нові' },
  { id: 'oldest', label: 'Старі' },
  { id: 'title', label: 'За алфавітом' },
  { id: 'rating', label: 'За рейтингом' },
  { id: 'popular', label: 'Популярні' },
];

function IngredientSearchIcon() {
  return (
    <svg
      className="filterIngredientSearchIcon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function sortIngredientNames(names) {
  return [...names].sort((a, b) => a.localeCompare(b, 'uk'));
}

export function RecipeFilters({
  categories,
  categoryId,
  onCategoryChange,
  timePreset,
  onTimePresetChange,
  selectedIngredients,
  onIngredientsChange,
  allIngredients,
  ingredientsLoading,
  sort,
  onSortChange,
  onReset,
}) {
  const isDesktop = useMediaQuery('(min-width: 901px)');
  const [ingredientSearch, setIngredientSearch] = useState('');

  const sortedIngredients = useMemo(() => sortIngredientNames(allIngredients), [allIngredients]);

  const visibleIngredients = useMemo(() => {
    const query = ingredientSearch.trim().toLowerCase();

    if (!query) return sortedIngredients;

    const matched = sortedIngredients.filter((name) => name.toLowerCase().includes(query));
    const selectedNotMatched = selectedIngredients.filter(
      (name) => !name.toLowerCase().includes(query) && !matched.some((item) => item.toLowerCase() === name.toLowerCase())
    );

    return sortIngredientNames([...selectedNotMatched, ...matched]);
  }, [sortedIngredients, ingredientSearch, selectedIngredients]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (categoryId) count += 1;
    if (timePreset) count += 1;
    if (selectedIngredients.length > 0) count += 1;
    if (sort && sort !== 'newest') count += 1;
    return count;
  }, [categoryId, timePreset, selectedIngredients, sort]);

  function toggleIngredient(name) {
    const key = name.toLowerCase();
    const exists = selectedIngredients.some((item) => item.toLowerCase() === key);
    if (exists) {
      onIngredientsChange(selectedIngredients.filter((item) => item.toLowerCase() !== key));
      return;
    }
    onIngredientsChange([...selectedIngredients, name]);
  }

  const filtersBody = (
    <>
      <div className="filterGroup">
        <h3 className="filterGroupTitle">Інгредієнти</h3>
        <div className="filterIngredientSearch">
          <IngredientSearchIcon />
          <input
            className="filterIngredientInput"
            type="search"
            value={ingredientSearch}
            onChange={(e) => setIngredientSearch(e.target.value)}
            placeholder="Пошук інгредієнта…"
            aria-label="Пошук інгредієнта у фільтрі"
          />
        </div>
        {ingredientsLoading ? <p className="muted filterIngredientHint">Завантаження…</p> : null}
        {!ingredientsLoading && !sortedIngredients.length ? (
          <p className="muted filterIngredientHint">Поки немає інгредієнтів для фільтра.</p>
        ) : null}
        {!ingredientsLoading && sortedIngredients.length ? (
          <ul className="filterList filterIngredientList">
            {visibleIngredients.map((name) => (
              <li key={name}>
                <label className="filterOption">
                  <input
                    type="checkbox"
                    checked={selectedIngredients.some((item) => item.toLowerCase() === name.toLowerCase())}
                    onChange={() => toggleIngredient(name)}
                  />
                  <span>{name}</span>
                </label>
              </li>
            ))}
            {!visibleIngredients.length ? (
              <li className="muted filterIngredientHint">Нічого не знайдено.</li>
            ) : null}
          </ul>
        ) : null}
      </div>

      <div className="filterGroup">
        <h3 className="filterGroupTitle">Сортування</h3>
        <select className="filterSelect" value={sort} onChange={(e) => onSortChange(e.target.value)} aria-label="Сортування">
          {SORT_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div className="filterGroup">
        <h3 className="filterGroupTitle">Фільтр за категорією</h3>
        <ul className="filterList">
          <li>
            <label className="filterOption">
              <input type="checkbox" checked={!categoryId} onChange={() => onCategoryChange('')} />
              <span>Усі категорії</span>
            </label>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <label className="filterOption">
                <input
                  type="checkbox"
                  checked={String(categoryId) === String(c.id)}
                  onChange={() => onCategoryChange(String(categoryId) === String(c.id) ? '' : String(c.id))}
                />
                <span>
                  {c.name}
                  {typeof c.recipe_count === 'number' ? (
                    <span className="filterCount"> ({c.recipe_count})</span>
                  ) : null}
                </span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <div className="filterGroup">
        <h3 className="filterGroupTitle">Час приготування</h3>
        <ul className="filterList">
          {TIME_PRESETS.map((p) => (
            <li key={p.id || 'any'}>
              <label className="filterOption">
                <input
                  type="checkbox"
                  checked={timePreset === p.id}
                  onChange={() => onTimePresetChange(timePreset === p.id ? '' : p.id)}
                />
                <span>{p.label}</span>
              </label>
            </li>
          ))}
        </ul>
      </div>

      <button type="button" className="btn btnSecondary" onClick={onReset}>
        Скинути фільтри
      </button>
    </>
  );

  return (
    <aside className="catalogSidebar">
      <details className="catalogFiltersDrawer" open={isDesktop || undefined}>
        <summary className="catalogFiltersSummary">
          <span>Фільтри</span>
          {activeFilterCount > 0 ? <span className="catalogFiltersBadge">{activeFilterCount}</span> : null}
        </summary>
        <div className="catalogFiltersBody">{filtersBody}</div>
      </details>
    </aside>
  );
}

export function timePresetToQuery(timePreset) {
  const preset = TIME_PRESETS.find((p) => p.id === timePreset);
  if (!preset || !preset.id) return { cooking_time_min: null, cooking_time_max: null };
  return { cooking_time_min: preset.min, cooking_time_max: preset.max };
}

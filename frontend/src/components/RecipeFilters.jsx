import React, { useMemo, useState } from 'react';

import { useMediaQuery } from '../utils/useMediaQuery';

export const TIME_PRESETS = [
  { id: 'under15', label: 'До 15 хв', min: null, max: 15 },
  { id: '15-30', label: '15–30 хв', min: 15, max: 30 },
  { id: '30-45', label: '30–45 хв', min: 30, max: 45 },
  { id: '45-60', label: '45–60 хв', min: 45, max: 60 },
  { id: '60-90', label: '60–90 хв', min: 60, max: 90 },
  { id: '90-120', label: '90–120 хв', min: 90, max: 120 },
  { id: 'over120', label: '120+ хв', min: 121, max: null },
  { id: 'under30', label: 'До 30 хв', min: null, max: 30 },
  { id: '30-60', label: '30–60 хв', min: 30, max: 60 },
  { id: 'over60', label: '60+ хв', min: 61, max: null },
];

const TIME_PRESET_IDS = new Set(TIME_PRESETS.map((p) => p.id));

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
  selectedCategoryIds,
  onCategoryChange,
  selectedTimePresets,
  onTimePresetsChange,
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
    if (selectedCategoryIds.length > 0) count += 1;
    if (selectedTimePresets.length > 0) count += 1;
    if (selectedIngredients.length > 0) count += 1;
    if (sort && sort !== 'newest') count += 1;
    return count;
  }, [selectedCategoryIds, selectedTimePresets, selectedIngredients, sort]);

  function toggleIngredient(name) {
    const key = name.toLowerCase();
    const exists = selectedIngredients.some((item) => item.toLowerCase() === key);
    if (exists) {
      onIngredientsChange(selectedIngredients.filter((item) => item.toLowerCase() !== key));
      return;
    }
    onIngredientsChange([...selectedIngredients, name]);
  }

  function toggleCategory(id) {
    const key = String(id);
    const exists = selectedCategoryIds.some((item) => String(item) === key);
    if (exists) {
      onCategoryChange(selectedCategoryIds.filter((item) => String(item) !== key));
      return;
    }
    onCategoryChange([...selectedCategoryIds, key]);
  }

  function toggleTimePreset(presetId) {
    const exists = selectedTimePresets.includes(presetId);
    if (exists) {
      onTimePresetsChange(selectedTimePresets.filter((id) => id !== presetId));
      return;
    }
    onTimePresetsChange([...selectedTimePresets, presetId]);
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
              <input
                type="checkbox"
                checked={selectedCategoryIds.length === 0}
                onChange={() => onCategoryChange([])}
              />
              <span>Усі категорії</span>
            </label>
          </li>
          {categories.map((c) => (
            <li key={c.id}>
              <label className="filterOption">
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.some((item) => String(item) === String(c.id))}
                  onChange={() => toggleCategory(c.id)}
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
            <li key={p.id}>
              <label className="filterOption">
                <input
                  type="checkbox"
                  checked={selectedTimePresets.includes(p.id)}
                  onChange={() => toggleTimePreset(p.id)}
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

export function parseTimePresetsParam(raw) {
  if (!raw || !String(raw).trim()) return [];
  return String(raw)
    .split(',')
    .map((part) => part.trim())
    .filter((id) => TIME_PRESET_IDS.has(id));
}

export function timePresetsToQuery(selectedTimePresets) {
  if (!selectedTimePresets?.length) return { time: null };
  return { time: selectedTimePresets.join(',') };
}

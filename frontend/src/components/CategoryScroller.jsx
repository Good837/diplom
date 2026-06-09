import React from 'react';

import { CategoryIcon } from './CategoryIcon';

export function CategoryScroller({ categories, categoryId, onSelect }) {
  if (!categories.length) return null;

  return (
    <div className="categoryScroller" role="list">
      {categories.map((c, index) => {
        const isActive = String(categoryId) === String(c.id);
        return (
          <button
            key={c.id}
            type="button"
            role="listitem"
            className={`categoryScrollerItem${isActive ? ' isActive' : ''}`}
            onClick={() => onSelect(isActive ? '' : String(c.id))}
            title={c.name}
          >
            <span className="categoryScrollerIcon">
              <CategoryIcon index={index} />
            </span>
            <span className="categoryScrollerLabel">{c.name}</span>
          </button>
        );
      })}
    </div>
  );
}

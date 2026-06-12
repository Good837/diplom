import React, { useCallback, useEffect, useRef, useState } from 'react';

import { CategoryIcon } from './CategoryIcon';

function ChevronIcon({ direction }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      {direction === 'left' ? <path d="M15 6l-6 6 6 6" /> : <path d="M9 6l6 6-6 6" />}
    </svg>
  );
}

export function CategoryScroller({ categories, selectedCategoryIds, onSelect }) {
  const scrollerRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 2);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = scrollerRef.current;
    if (!el) return undefined;

    el.addEventListener('scroll', updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    observer.observe(el);

    return () => {
      el.removeEventListener('scroll', updateScrollState);
      observer.disconnect();
    };
  }, [categories, updateScrollState]);

  function scrollByDirection(direction) {
    const el = scrollerRef.current;
    if (!el) return;
    const itemWidth = el.querySelector('.categoryScrollerItem')?.offsetWidth || 92;
    el.scrollBy({ left: direction * itemWidth * 2.5, behavior: 'smooth' });
  }

  function toggleCategory(id) {
    const key = String(id);
    const exists = selectedCategoryIds.some((item) => String(item) === key);
    if (exists) {
      onSelect(selectedCategoryIds.filter((item) => String(item) !== key));
      return;
    }
    onSelect([...selectedCategoryIds, key]);
  }

  if (!categories.length) return null;

  return (
    <div className="categoryScrollerWrap">
      {canScrollLeft ? (
        <button
          type="button"
          className="categoryScrollerNav categoryScrollerNavPrev"
          onClick={() => scrollByDirection(-1)}
          aria-label="Попередні категорії"
        >
          <ChevronIcon direction="left" />
        </button>
      ) : null}

      <div className="categoryScroller" ref={scrollerRef} role="list">
        {categories.map((c, index) => {
          const isActive = selectedCategoryIds.some((item) => String(item) === String(c.id));
          return (
            <button
              key={c.id}
              type="button"
              role="listitem"
              className={`categoryScrollerItem${isActive ? ' isActive' : ''}`}
              onClick={() => toggleCategory(c.id)}
              title={c.name}
              aria-pressed={isActive}
            >
              <span className="categoryScrollerIcon">
                <CategoryIcon index={index} />
              </span>
              <span className="categoryScrollerLabel">{c.name}</span>
            </button>
          );
        })}
      </div>

      {canScrollRight ? (
        <button
          type="button"
          className="categoryScrollerNav categoryScrollerNavNext"
          onClick={() => scrollByDirection(1)}
          aria-label="Наступні категорії"
        >
          <ChevronIcon direction="right" />
        </button>
      ) : null}
    </div>
  );
}

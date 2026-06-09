import React from 'react';

export function Pagination({ page, pages, onPageChange }) {
  if (!pages || pages <= 1) return null;

  const items = [];
  const maxVisible = 7;
  let start = Math.max(1, page - Math.floor(maxVisible / 2));
  let end = Math.min(pages, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);

  if (page > 1) {
    items.push(
      <button key="prev" type="button" className="paginationBtn" onClick={() => onPageChange(page - 1)} aria-label="Попередня">
        ‹
      </button>
    );
  }

  for (let i = start; i <= end; i += 1) {
    items.push(
      <button
        key={i}
        type="button"
        className={`paginationBtn${i === page ? ' isActive' : ''}`}
        onClick={() => onPageChange(i)}
        aria-current={i === page ? 'page' : undefined}
      >
        {i}
      </button>
    );
  }

  if (page < pages) {
    items.push(
      <button key="next" type="button" className="paginationBtn" onClick={() => onPageChange(page + 1)} aria-label="Наступна">
        ›
      </button>
    );
  }

  return <nav className="pagination" aria-label="Сторінки">{items}</nav>;
}

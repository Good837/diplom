import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { apiFetch } from '../api/client';

export function IngredientNameInput({ value, onChange, disabled, placeholder = 'Назва', maxLength = 120 }) {
  const listId = useId();
  const inputRef = useRef(null);
  const blurTimer = useRef(null);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [listStyle, setListStyle] = useState(null);

  const updateListPosition = useCallback(() => {
    const input = inputRef.current;
    if (!input) return;
    const rect = input.getBoundingClientRect();
    setListStyle({
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    const query = String(value || '').trim();
    if (query.length < 2) {
      setSuggestions([]);
      setOpen(false);
      setActiveIndex(-1);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiFetch(`/ingredients/suggest?q=${encodeURIComponent(query)}&limit=10`);
        const items = data.items || [];
        setSuggestions(items);
        setOpen(items.length > 0);
        setActiveIndex(-1);
      } catch {
        setSuggestions([]);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    if (!open) return undefined;

    updateListPosition();
    window.addEventListener('resize', updateListPosition);
    window.addEventListener('scroll', updateListPosition, true);

    return () => {
      window.removeEventListener('resize', updateListPosition);
      window.removeEventListener('scroll', updateListPosition, true);
    };
  }, [open, suggestions, updateListPosition]);

  function selectSuggestion(name) {
    onChange(name);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  }

  function handleBlur() {
    blurTimer.current = setTimeout(() => setOpen(false), 150);
  }

  function handleFocus() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    if (suggestions.length) {
      updateListPosition();
      setOpen(true);
    }
  }

  function handleKeyDown(e) {
    if (!open || !suggestions.length) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((idx) => (idx + 1) % suggestions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((idx) => (idx <= 0 ? suggestions.length - 1 : idx - 1));
      return;
    }

    if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[activeIndex]);
      return;
    }

    if (e.key === 'Escape') {
      setOpen(false);
      setActiveIndex(-1);
    }
  }

  const dropdown =
    open && listStyle
      ? createPortal(
          <ul
            className="ingredientSuggestList ingredientSuggestListPortal"
            id={listId}
            role="listbox"
            style={listStyle}
          >
            {suggestions.map((name, index) => (
              <li key={name}>
                <button
                  type="button"
                  className={
                    index === activeIndex ? 'ingredientSuggestItem ingredientSuggestItemActive' : 'ingredientSuggestItem'
                  }
                  role="option"
                  aria-selected={index === activeIndex}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => selectSuggestion(name)}
                >
                  {name}
                </button>
              </li>
            ))}
          </ul>,
          document.body
        )
      : null;

  return (
    <div className="ingredientSuggest">
      <input
        ref={inputRef}
        className="ingredientName"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
      />
      {dropdown}
      {loading ? <span className="ingredientSuggestLoading muted">…</span> : null}
    </div>
  );
}

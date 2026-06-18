import React from 'react';

export const CATEGORY_ICON_COUNT = 8;

export const CATEGORY_ICONS = [
  { id: 0, label: 'Торт' },
  { id: 1, label: 'Миска' },
  { id: 2, label: 'Листок' },
  { id: 3, label: 'Каструля' },
  { id: 4, label: 'Круасан' },
  { id: 5, label: 'Риба' },
  { id: 6, label: 'Кава' },
  { id: 7, label: 'Піца' },
];

const ICONS = [
  <svg key="cupcake" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 28h20v6a10 10 0 01-20 0v-6z" />
    <path d="M16 28c0-8 4-14 8-14s8 6 8 14" />
    <circle cx="20" cy="18" r="1.5" fill="currentColor" />
    <circle cx="28" cy="16" r="1.5" fill="currentColor" />
  </svg>,
  <svg key="bowl" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M10 22c0 12 6 18 14 18s14-6 14-18H10z" />
    <path d="M18 14c2-4 4-6 6-6" />
  </svg>,
  <svg key="leaf" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M24 38V18M24 18c-8-10-18-8-18 2 0 8 8 12 18 12s18-4 18-12c0-10-10-12-18-2z" />
  </svg>,
  <svg key="pot" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="12" y="20" width="24" height="16" rx="2" />
    <path d="M10 20h28M16 16h16" />
    <path d="M20 12v4M28 12v4" />
  </svg>,
  <svg key="croissant" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M12 30c8-14 20-20 28-14-4 10-14 18-28 14z" />
  </svg>,
  <svg key="fish" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <ellipse cx="22" cy="24" rx="12" ry="8" />
    <path d="M34 24l8-6v12l-8-6z" />
    <circle cx="18" cy="22" r="1.5" fill="currentColor" />
  </svg>,
  <svg key="coffee" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M14 18h16v14a8 8 0 01-16 0V18z" />
    <path d="M30 22h4a4 4 0 010 8h-4" />
    <path d="M16 14h12" />
  </svg>,
  <svg key="pizza" viewBox="0 0 48 48" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M24 8L40 38H8L24 8z" />
    <circle cx="22" cy="26" r="2" fill="currentColor" />
    <circle cx="28" cy="30" r="2" fill="currentColor" />
  </svg>,
];

export function CategoryIcon({ index = 0 }) {
  const safeIndex = Number.isFinite(index) ? index : 0;
  return ICONS[((safeIndex % CATEGORY_ICON_COUNT) + CATEGORY_ICON_COUNT) % CATEGORY_ICON_COUNT];
}

function dateValue(iso) {
  if (!iso) return null;
  const time = new Date(iso).getTime();
  return Number.isFinite(time) ? time : null;
}

function compareDates(aIso, bIso, direction) {
  const a = dateValue(aIso);
  const b = dateValue(bIso);
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  return direction === 'asc' ? a - b : b - a;
}

export const RECIPE_SORT_OPTIONS = [
  { id: 'date_desc', label: 'За датою (новіші спочатку)' },
  { id: 'date_asc', label: 'За датою (старіші спочатку)' },
  { id: 'title_asc', label: 'За алфавітом (А–Я)' },
  { id: 'title_desc', label: 'За алфавітом (Я–А)' },
];

export const COMMENT_SORT_OPTIONS = [
  { id: 'date_desc', label: 'Від нових до старих' },
  { id: 'date_asc', label: 'Від старих до нових' },
];

export function sortProfileRecipes(items, sort = 'date_desc') {
  const list = [...items];
  list.sort((a, b) => {
    if (sort === 'title_asc' || sort === 'title_desc') {
      const cmp = String(a?.title || '').localeCompare(String(b?.title || ''), 'uk', {
        sensitivity: 'base',
      });
      return sort === 'title_asc' ? cmp : -cmp;
    }
    return compareDates(a?.created_at, b?.created_at, sort === 'date_asc' ? 'asc' : 'desc');
  });
  return list;
}

export function sortProfileComments(items, sort = 'date_desc') {
  const list = [...items];
  list.sort((a, b) =>
    compareDates(a?.created_at, b?.created_at, sort === 'date_asc' ? 'asc' : 'desc')
  );
  return list;
}

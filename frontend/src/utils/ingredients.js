export const ALLOWED_UNITS = ['г', 'кг', 'мл', 'л', 'шт', 'ст.л', 'ч.л', 'склянка', 'пучок', 'за смаком'];

export const EMPTY_INGREDIENT = { name: '', amount: '', unit: 'шт' };

export function normalizeIngredientsForForm(initial) {
  if (!Array.isArray(initial) || !initial.length) {
    return [{ ...EMPTY_INGREDIENT }];
  }
  return initial.map((item) => ({
    name: item?.name || '',
    amount: item?.amount == null ? '' : String(item.amount),
    unit: item?.unit || 'шт',
  }));
}

export function serializeIngredientsForApi(rows) {
  return rows
    .filter((row) => String(row?.name || '').trim())
    .map(({ name, amount, unit }) => ({
      name: name.trim(),
      amount: unit === 'за смаком' || amount === '' || amount == null ? null : Number(amount),
      unit,
    }));
}

export function formatIngredientDisplay({ name, amount, unit }) {
  if (unit === 'за смаком' || amount == null) {
    return `${name} — за смаком`;
  }
  const n = Number(amount);
  let amountText;
  if (n === 0.5) amountText = '½';
  else if (n === 0.25) amountText = '¼';
  else if (n === 0.75) amountText = '¾';
  else if (Number.isInteger(n)) amountText = String(n);
  else amountText = String(n);
  return `${name} — ${amountText} ${unit}`;
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MAX_TITLE = 200;
export const MAX_DESCRIPTION = 2000;
export const MAX_INGREDIENT_NAME = 120;
export const MAX_INSTRUCTIONS = 8000;
export const MAX_USERNAME = 50;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export function isValidEmail(email) {
  return EMAIL_RE.test(String(email || '').trim());
}

export function validateImageFile(file) {
  if (!file) return null;
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return 'Дозволені лише JPG, PNG, GIF або WEBP.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'Файл занадто великий (максимум 5 МБ).';
  }
  return null;
}

export function validateRecipeFields({ title, description, ingredients, instructions, cookingTime, categoryId, imageFile }) {
  const errors = {};
  if (!title.trim()) errors.title = "Вкажіть назву рецепта.";
  else if (title.trim().length > MAX_TITLE) errors.title = `Назва не довша за ${MAX_TITLE} символів.`;
  if (!description.trim()) errors.description = 'Вкажіть опис.';
  else if (description.trim().length > MAX_DESCRIPTION) errors.description = `Опис не довший за ${MAX_DESCRIPTION} символів.`;
  if (!Array.isArray(ingredients) || !ingredients.length) {
    errors.ingredients = 'Додайте хоча б один інгредієнт.';
  } else {
    const hasNamed = ingredients.some((row) => String(row?.name || '').trim());
    if (!hasNamed) errors.ingredients = 'Вкажіть назву хоча б одного інгредієнта.';
    else if (ingredients.some((row) => String(row?.name || '').trim().length > MAX_INGREDIENT_NAME)) {
      errors.ingredients = `Назва інгредієнта не довша за ${MAX_INGREDIENT_NAME} символів.`;
    }
  }
  if (!instructions.trim()) errors.instructions = 'Вкажіть інструкції.';
  else if (instructions.trim().length > MAX_INSTRUCTIONS) {
    errors.instructions = `Інструкції не довші за ${MAX_INSTRUCTIONS} символів.`;
  }
  if (!Number(cookingTime) || Number(cookingTime) < 1) errors.cookingTime = 'Час приготування має бути більше 0.';
  if (!categoryId) errors.categoryId = 'Оберіть категорію.';
  const imageError = validateImageFile(imageFile);
  if (imageError) errors.image = imageError;
  return errors;
}

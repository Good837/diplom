export const RECIPE_STATUS_LABELS = {
  pending: 'На модерації',
  approved: 'Опубліковано',
  rejected: 'Відхилено',
};

export function getRecipeStatusLabel(status) {
  return RECIPE_STATUS_LABELS[status] || status;
}

export function isRecipePublished(recipe) {
  return recipe?.status === 'approved';
}

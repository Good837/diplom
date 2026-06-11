from __future__ import annotations

from flask_jwt_extended import get_jwt_identity

from .errors import APIError
from .models import Recipe, RecipeStatus, User


def get_current_user() -> User:
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id)) if user_id is not None else None
    if not user:
        raise APIError("Користувача не знайдено", 404)
    return user


def require_admin() -> User:
    user = get_current_user()
    if not user.is_admin:
        raise APIError("Недостатньо прав для цієї дії", 403)
    return user


def can_manage_recipe(*, current_user: User, recipe_owner_id: int) -> bool:
    return bool(current_user.is_admin) or int(current_user.id) == int(recipe_owner_id)


def is_recipe_publicly_visible(recipe: Recipe) -> bool:
    return recipe.status == RecipeStatus.approved


def can_view_recipe(*, recipe: Recipe, viewer: User | None) -> bool:
    if is_recipe_publicly_visible(recipe):
        return True
    if viewer is None:
        return False
    return bool(viewer.is_admin) or int(viewer.id) == int(recipe.owner_id)


def require_approved_recipe(recipe: Recipe) -> None:
    if not is_recipe_publicly_visible(recipe):
        raise APIError("Ця дія доступна лише для опублікованих рецептів", 403)


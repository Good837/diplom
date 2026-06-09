from __future__ import annotations

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required

from ..authz import get_current_user
from ..errors import APIError
from ..extensions import db
from ..ingredients import aggregate_ingredients
from ..models import Recipe, ShoppingListRecipe
from ..ratings import recipes_to_dicts_with_ratings

shopping_list_bp = Blueprint("shopping_list", __name__)


def _user_entries(user_id: int) -> list[ShoppingListRecipe]:
    return (
        ShoppingListRecipe.query.filter(ShoppingListRecipe.user_id == user_id)
        .order_by(ShoppingListRecipe.created_at.asc())
        .all()
    )


@shopping_list_bp.get("")
@jwt_required()
def get_shopping_list():
    user = get_current_user()
    rows = _user_entries(user.id)
    if not rows:
        return jsonify({"recipes": [], "items": []})

    recipe_ids = [r.recipe_id for r in rows]
    recipes = Recipe.query.filter(Recipe.id.in_(recipe_ids)).all()
    by_id = {r.id: r for r in recipes}
    ordered = [by_id[rid] for rid in recipe_ids if rid in by_id]

    return jsonify(
        {
            "recipes": recipes_to_dicts_with_ratings(ordered, current_user_id=user.id),
            "items": aggregate_ingredients(ordered),
        }
    )


@shopping_list_bp.post("/recipes/<int:recipe_id>")
@jwt_required()
def add_recipe(recipe_id: int):
    if not Recipe.query.get(recipe_id):
        raise APIError("Рецепт не знайдено", 404)

    user = get_current_user()
    exists = ShoppingListRecipe.query.filter_by(user_id=user.id, recipe_id=recipe_id).first()
    if exists:
        return jsonify({"message": "Рецепт уже в списку покупок"}), 200

    row = ShoppingListRecipe(user_id=user.id, recipe_id=recipe_id)
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Рецепт додано до списку покупок"}), 201


@shopping_list_bp.delete("/recipes/<int:recipe_id>")
@jwt_required()
def remove_recipe(recipe_id: int):
    user = get_current_user()
    row = ShoppingListRecipe.query.filter_by(user_id=user.id, recipe_id=recipe_id).first()
    if not row:
        return jsonify({"message": "Рецепт не був у списку"}), 200

    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Рецепт прибрано зі списку покупок"})


@shopping_list_bp.delete("")
@jwt_required()
def clear_shopping_list():
    user = get_current_user()
    ShoppingListRecipe.query.filter_by(user_id=user.id).delete()
    db.session.commit()
    return jsonify({"message": "Список покупок очищено"})

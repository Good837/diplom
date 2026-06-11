from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..authz import require_admin
from ..errors import APIError
from ..extensions import db
from ..models import Comment, Recipe, RecipeStatus
from ..ratings import recipe_to_dict_with_ratings, recipes_to_dicts_with_ratings

admin_bp = Blueprint("admin", __name__)


def _int_query(name: str, default: int) -> int:
    raw = request.args.get(name, None)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        raise APIError(f"Некоректне значення параметра '{name}'", 400)


@admin_bp.get("/comments")
@jwt_required()
def list_comments_for_moderation():
    require_admin()
    page = max(1, _int_query("page", 1))
    per_page = _int_query("per_page", 20)
    per_page = max(1, min(100, per_page))

    pagination = (
        Comment.query.order_by(Comment.created_at.desc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    items = []
    for comment in pagination.items:
        data = comment.to_dict()
        recipe = Recipe.query.get(comment.recipe_id)
        data["recipe_title"] = recipe.title if recipe else None
        items.append(data)

    return jsonify(
        {
            "items": items,
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }
    )


@admin_bp.get("/recipes/pending")
@jwt_required()
def list_pending_recipes():
    admin = require_admin()
    page = max(1, _int_query("page", 1))
    per_page = _int_query("per_page", 20)
    per_page = max(1, min(100, per_page))

    pagination = (
        Recipe.query.filter(Recipe.status == RecipeStatus.pending)
        .order_by(Recipe.created_at.asc())
        .paginate(page=page, per_page=per_page, error_out=False)
    )

    items = recipes_to_dicts_with_ratings(pagination.items, current_user_id=admin.id)
    return jsonify(
        {
            "items": items,
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }
    )


@admin_bp.post("/recipes/<int:recipe_id>/approve")
@jwt_required()
def approve_recipe(recipe_id: int):
    admin = require_admin()
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        raise APIError("Рецепт не знайдено", 404)
    if recipe.status != RecipeStatus.pending:
        raise APIError("Рецепт не очікує модерації", 409)

    recipe.status = RecipeStatus.approved
    db.session.commit()
    return jsonify(
        {
            "message": "Рецепт схвалено",
            "recipe": recipe_to_dict_with_ratings(recipe, current_user_id=admin.id),
        }
    )


@admin_bp.post("/recipes/<int:recipe_id>/reject")
@jwt_required()
def reject_recipe(recipe_id: int):
    admin = require_admin()
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        raise APIError("Рецепт не знайдено", 404)
    if recipe.status != RecipeStatus.pending:
        raise APIError("Рецепт не очікує модерації", 409)

    recipe.status = RecipeStatus.rejected
    db.session.commit()
    return jsonify(
        {
            "message": "Рецепт відхилено",
            "recipe": recipe_to_dict_with_ratings(recipe, current_user_id=admin.id),
        }
    )

from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request

from ..errors import APIError
from ..extensions import db
from ..models import Category, Comment, Recipe, SavedRecipe
from ..authz import can_manage_recipe, get_current_user

recipes_bp = Blueprint("recipes", __name__)

def _int_query(name: str, default: int | None = None) -> int | None:
    raw = request.args.get(name, None)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        raise APIError(f"Некоректне значення параметра '{name}'", 400)


def _paginate(query):
    page = _int_query("page", 1) or 1
    per_page = _int_query("per_page", 20) or 20
    if page < 1:
        page = 1
    if per_page < 1:
        per_page = 1
    if per_page > 100:
        per_page = 100

    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    return pagination, page, per_page


@recipes_bp.get("")
def list_recipes():
    q = (request.args.get("q") or "").strip()
    category_id = _int_query("category_id", None)
    cooking_time_max = _int_query("cooking_time_max", None)
    owner = (request.args.get("owner") or "").strip().lower()

    query = Recipe.query

    if q:
        like = f"%{q}%"
        # Title-only search (as required by spec)
        query = query.filter(Recipe.title.ilike(like))

    if category_id is not None:
        query = query.filter(Recipe.category_id == category_id)

    if cooking_time_max is not None:
        query = query.filter(Recipe.cooking_time <= cooking_time_max)

    if owner == "me":
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        query = query.filter(Recipe.owner_id == user_id)

    query = query.order_by(Recipe.created_at.desc())
    pagination, page, per_page = _paginate(query)

    items = [r.to_dict() for r in pagination.items]
    return jsonify(
        {
            "items": items,
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }
    )


@recipes_bp.get("/<int:recipe_id>")
def get_recipe(recipe_id: int):
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        raise APIError("Рецепт не знайдено", 404)
    return jsonify({"recipe": recipe.to_dict()})


@recipes_bp.post("")
@jwt_required()
def create_recipe():
    data = request.get_json(silent=True) or {}
    required = ["title", "description", "ingredients", "instructions", "cooking_time", "category_id"]
    missing = [f for f in required if data.get(f) in (None, "", [])]
    if missing:
        raise APIError("Некоректні дані", 400, details={"missing": missing})

    title = str(data["title"]).strip()
    description = str(data["description"]).strip()
    ingredients = str(data["ingredients"]).strip()
    instructions = str(data["instructions"]).strip()

    try:
        cooking_time = int(data["cooking_time"])
    except (TypeError, ValueError):
        raise APIError("Поле 'час приготування' має бути числом", 400)
    if cooking_time <= 0:
        raise APIError("Час приготування має бути більшим за 0", 400)

    try:
        category_id = int(data["category_id"])
    except (TypeError, ValueError):
        raise APIError("Некоректна категорія", 400)

    category = Category.query.get(category_id)
    if not category:
        raise APIError("Категорію не знайдено", 404)

    owner_id = int(get_jwt_identity())

    recipe = Recipe(
        title=title,
        description=description,
        ingredients=ingredients,
        instructions=instructions,
        cooking_time=cooking_time,
        image_url=(str(data.get("image_url")).strip() if data.get("image_url") else None),
        owner_id=owner_id,
        category_id=category_id,
    )
    db.session.add(recipe)
    db.session.commit()

    return jsonify({"message": "Рецепт успішно створено", "recipe": recipe.to_dict()}), 201


def _require_owner(recipe: Recipe, user_id: int) -> None:
    if recipe.owner_id != user_id:
        raise APIError("Недостатньо прав для цієї дії", 403)


@recipes_bp.put("/<int:recipe_id>")
@jwt_required()
def update_recipe(recipe_id: int):
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        raise APIError("Рецепт не знайдено", 404)

    user_id = int(get_jwt_identity())
    _require_owner(recipe, user_id)

    data = request.get_json(silent=True) or {}

    if "title" in data:
        recipe.title = str(data["title"]).strip()
    if "description" in data:
        recipe.description = str(data["description"]).strip()
    if "ingredients" in data:
        recipe.ingredients = str(data["ingredients"]).strip()
    if "instructions" in data:
        recipe.instructions = str(data["instructions"]).strip()
    if "image_url" in data:
        recipe.image_url = str(data["image_url"]).strip() if data["image_url"] else None
    if "cooking_time" in data:
        try:
            cooking_time = int(data["cooking_time"])
        except (TypeError, ValueError):
            raise APIError("Поле 'час приготування' має бути числом", 400)
        if cooking_time <= 0:
            raise APIError("Час приготування має бути більшим за 0", 400)
        recipe.cooking_time = cooking_time
    if "category_id" in data:
        try:
            category_id = int(data["category_id"])
        except (TypeError, ValueError):
            raise APIError("Некоректна категорія", 400)
        if not Category.query.get(category_id):
            raise APIError("Категорію не знайдено", 404)
        recipe.category_id = category_id

    db.session.commit()
    return jsonify({"message": "Рецепт успішно оновлено", "recipe": recipe.to_dict()})


@recipes_bp.delete("/<int:recipe_id>")
@jwt_required()
def delete_recipe(recipe_id: int):
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        raise APIError("Рецепт не знайдено", 404)

    current_user = get_current_user()
    if not can_manage_recipe(current_user=current_user, recipe_owner_id=recipe.owner_id):
        raise APIError("Недостатньо прав для цієї дії", 403)

    db.session.delete(recipe)
    db.session.commit()
    return jsonify({"message": "Рецепт успішно видалено"})


@recipes_bp.get("/<int:recipe_id>/comments")
def list_comments(recipe_id: int):
    if not Recipe.query.get(recipe_id):
        raise APIError("Рецепт не знайдено", 404)

    items = (
        Comment.query.filter(Comment.recipe_id == recipe_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return jsonify({"items": [c.to_dict() for c in items]})


@recipes_bp.post("/<int:recipe_id>/comments")
@jwt_required()
def create_comment(recipe_id: int):
    if not Recipe.query.get(recipe_id):
        raise APIError("Рецепт не знайдено", 404)

    data = request.get_json(silent=True) or {}
    body = str(data.get("body") or "").strip()
    if not body:
        raise APIError("Некоректні дані", 400, details={"missing": ["body"]})

    user_id = int(get_jwt_identity())
    comment = Comment(body=body, recipe_id=recipe_id, author_id=user_id)
    db.session.add(comment)
    db.session.commit()
    return jsonify({"message": "Коментар додано", "comment": comment.to_dict()}), 201


@recipes_bp.post("/<int:recipe_id>/save")
@jwt_required()
def save_recipe(recipe_id: int):
    if not Recipe.query.get(recipe_id):
        raise APIError("Рецепт не знайдено", 404)

    user_id = int(get_jwt_identity())
    exists = SavedRecipe.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()
    if exists:
        return jsonify({"message": "Рецепт уже збережено"}), 200

    row = SavedRecipe(user_id=user_id, recipe_id=recipe_id)
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Рецепт збережено"}), 201


@recipes_bp.delete("/<int:recipe_id>/save")
@jwt_required()
def unsave_recipe(recipe_id: int):
    user_id = int(get_jwt_identity())
    row = SavedRecipe.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()
    if not row:
        return jsonify({"message": "Рецепт не був збережений"}), 200

    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Рецепт прибрано зі збережених"})

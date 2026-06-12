from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request
from sqlalchemy import and_, func, or_

from ..authz import (
    can_manage_recipe,
    can_view_recipe,
    get_current_user,
    require_approved_recipe,
)
from ..errors import APIError
from ..extensions import db
from ..ingredients import parse_ingredients_payload
from ..models import Category, Comment, Rating, Recipe, RecipeIngredient, RecipeStatus, SavedRecipe, User
from ..ratings import recipe_to_dict_with_ratings, recipes_to_dicts_with_ratings

recipes_bp = Blueprint("recipes", __name__)

def _int_query(name: str, default: int | None = None) -> int | None:
    raw = request.args.get(name, None)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        raise APIError(f"Некоректне значення параметра '{name}'", 400)


def _optional_user_id() -> int | None:
    verify_jwt_in_request(optional=True)
    identity = get_jwt_identity()
    return int(identity) if identity is not None else None


def _optional_current_user() -> User | None:
    verify_jwt_in_request(optional=True)
    identity = get_jwt_identity()
    if identity is None:
        return None
    return User.query.get(int(identity))


def _parse_status_filter(raw: str) -> RecipeStatus:
    try:
        return RecipeStatus(raw.strip().lower())
    except ValueError:
        raise APIError("Некоректне значення параметра 'status'", 400)


def _get_recipe_or_404(recipe_id: int) -> Recipe:
    recipe = Recipe.query.get(recipe_id)
    if not recipe:
        raise APIError("Рецепт не знайдено", 404)
    return recipe


def _require_recipe_view(recipe: Recipe) -> None:
    if not can_view_recipe(recipe=recipe, viewer=_optional_current_user()):
        raise APIError("Рецепт не знайдено", 404)


def _apply_ingredients(recipe: Recipe, items: list[dict]) -> None:
    recipe.ingredients.clear()
    for position, item in enumerate(items):
        recipe.ingredients.append(
            RecipeIngredient(
                name=item["name"],
                amount=item["amount"],
                unit=item["unit"],
                position=position,
            )
        )


def _parse_rating_value(data: dict) -> int:
    raw = data.get("value")
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise APIError("Оцінка має бути цілим числом від 1 до 5", 400)
    if value < 1 or value > 5:
        raise APIError("Оцінка має бути від 1 до 5", 400)
    return value


TIME_PRESETS: dict[str, tuple[int | None, int | None]] = {
    "under15": (None, 15),
    "15-30": (15, 30),
    "30-45": (30, 45),
    "45-60": (45, 60),
    "60-90": (60, 90),
    "90-120": (90, 120),
    "over120": (121, None),
    "under30": (None, 30),
    "30-60": (30, 60),
    "over60": (61, None),
}


def _parse_comma_list_param(name: str) -> list[str]:
    values: list[str] = []
    raw = (request.args.get(name) or "").strip()
    if raw:
        values.extend(part.strip() for part in raw.split(",") if part.strip())
    for part in request.args.getlist(name):
        text = (part or "").strip()
        if text:
            values.extend(item.strip() for item in text.split(",") if item.strip())
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        key = value.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append(value)
    return unique


def _parse_category_ids() -> list[int]:
    ids: list[int] = []
    seen: set[int] = set()
    for raw in _parse_comma_list_param("category_id"):
        try:
            category_id = int(raw)
        except ValueError:
            raise APIError("Некоректне значення параметра 'category_id'", 400)
        if category_id in seen:
            continue
        seen.add(category_id)
        ids.append(category_id)
    return ids


def _parse_time_preset_ids() -> list[str]:
    preset_ids: list[str] = []
    seen: set[str] = set()
    for raw in _parse_comma_list_param("time"):
        if raw not in TIME_PRESETS:
            raise APIError("Некоректне значення параметра 'time'", 400)
        if raw in seen:
            continue
        seen.add(raw)
        preset_ids.append(raw)
    return preset_ids


def _apply_time_preset_filters(query, preset_ids: list[str]):
    conditions = []
    for preset_id in preset_ids:
        tmin, tmax = TIME_PRESETS[preset_id]
        parts = []
        if tmin is not None:
            parts.append(Recipe.cooking_time >= tmin)
        if tmax is not None:
            parts.append(Recipe.cooking_time <= tmax)
        if parts:
            conditions.append(and_(*parts))
    if conditions:
        query = query.filter(or_(*conditions))
    return query


def _parse_ingredient_filters() -> list[str]:
    names: list[str] = []

    ingredients_raw = (request.args.get("ingredients") or "").strip()
    if ingredients_raw:
        names.extend(part.strip() for part in ingredients_raw.split(",") if part.strip())

    for part in request.args.getlist("ingredient"):
        text = (part or "").strip()
        if text:
            names.append(text)

    seen: set[str] = set()
    unique: list[str] = []
    for name in names:
        key = name.casefold()
        if key in seen:
            continue
        seen.add(key)
        unique.append(name)
    return unique


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
    ingredient_names = _parse_ingredient_filters()
    category_ids = _parse_category_ids()
    time_preset_ids = _parse_time_preset_ids()
    cooking_time_max = _int_query("cooking_time_max", None)
    cooking_time_min = _int_query("cooking_time_min", None)
    owner = (request.args.get("owner") or "").strip().lower()
    status_raw = (request.args.get("status") or "").strip().lower()
    sort = (request.args.get("sort") or "newest").strip().lower()
    current_user_id = _optional_user_id()
    current_user = _optional_current_user()

    query = Recipe.query

    if owner == "me":
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
        query = query.filter(Recipe.owner_id == user_id)
    elif status_raw and current_user and current_user.is_admin:
        query = query.filter(Recipe.status == _parse_status_filter(status_raw))
    else:
        query = query.filter(Recipe.status == RecipeStatus.approved)

    if q:
        like = f"%{q}%"
        # Title-only search (as required by spec)
        query = query.filter(Recipe.title.ilike(like))

    for ingredient_name in ingredient_names:
        query = query.filter(
            Recipe.ingredients.any(func.lower(RecipeIngredient.name) == ingredient_name.casefold())
        )

    if category_ids:
        query = query.filter(Recipe.category_id.in_(category_ids))

    if time_preset_ids:
        query = _apply_time_preset_filters(query, time_preset_ids)
    else:
        if cooking_time_max is not None:
            query = query.filter(Recipe.cooking_time <= cooking_time_max)

        if cooking_time_min is not None:
            query = query.filter(Recipe.cooking_time >= cooking_time_min)

    if sort == "title":
        query = query.order_by(Recipe.title.asc())
    elif sort == "oldest":
        query = query.order_by(Recipe.created_at.asc())
    elif sort == "rating":
        avg_subq = (
            db.session.query(
                Rating.recipe_id.label("recipe_id"),
                func.avg(Rating.value).label("rating_avg"),
            )
            .group_by(Rating.recipe_id)
            .subquery()
        )
        query = query.outerjoin(avg_subq, Recipe.id == avg_subq.c.recipe_id)
        query = query.order_by(func.coalesce(avg_subq.c.rating_avg, -1).desc(), Recipe.created_at.desc())
    elif sort == "popular":
        saves_subq = (
            db.session.query(
                SavedRecipe.recipe_id.label("recipe_id"),
                func.count(SavedRecipe.id).label("save_count"),
            )
            .group_by(SavedRecipe.recipe_id)
            .subquery()
        )
        query = query.outerjoin(saves_subq, Recipe.id == saves_subq.c.recipe_id)
        query = query.order_by(func.coalesce(saves_subq.c.save_count, 0).desc(), Recipe.created_at.desc())
    else:
        query = query.order_by(Recipe.created_at.desc())

    pagination, page, per_page = _paginate(query)

    items = recipes_to_dicts_with_ratings(pagination.items, current_user_id=current_user_id)
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
    recipe = _get_recipe_or_404(recipe_id)
    _require_recipe_view(recipe)
    return jsonify({"recipe": recipe_to_dict_with_ratings(recipe, current_user_id=_optional_user_id())})


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
    instructions = str(data["instructions"]).strip()
    ingredient_items = parse_ingredients_payload(data.get("ingredients"))

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
        instructions=instructions,
        cooking_time=cooking_time,
        image_url=(str(data.get("image_url")).strip() if data.get("image_url") else None),
        owner_id=owner_id,
        category_id=category_id,
        status=RecipeStatus.pending,
    )
    _apply_ingredients(recipe, ingredient_items)
    db.session.add(recipe)
    db.session.commit()

    return jsonify(
        {
            "message": "Рецепт надіслано на модерацію",
            "recipe": recipe_to_dict_with_ratings(recipe, current_user_id=owner_id),
        }
    ), 201


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
        _apply_ingredients(recipe, parse_ingredients_payload(data["ingredients"]))
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

    recipe.status = RecipeStatus.pending
    db.session.commit()
    return jsonify(
        {
            "message": "Рецепт оновлено та надіслано на повторну модерацію",
            "recipe": recipe_to_dict_with_ratings(recipe, current_user_id=user_id),
        }
    )


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
    recipe = _get_recipe_or_404(recipe_id)
    _require_recipe_view(recipe)
    require_approved_recipe(recipe)

    items = (
        Comment.query.filter(Comment.recipe_id == recipe_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return jsonify({"items": [c.to_dict() for c in items]})


@recipes_bp.post("/<int:recipe_id>/comments")
@jwt_required()
def create_comment(recipe_id: int):
    recipe = _get_recipe_or_404(recipe_id)
    _require_recipe_view(recipe)
    require_approved_recipe(recipe)

    data = request.get_json(silent=True) or {}
    body = str(data.get("body") or "").strip()
    if not body:
        raise APIError("Некоректні дані", 400, details={"missing": ["body"]})

    user_id = int(get_jwt_identity())
    comment = Comment(body=body, recipe_id=recipe_id, author_id=user_id)
    db.session.add(comment)
    db.session.commit()
    return jsonify({"message": "Коментар додано", "comment": comment.to_dict()}), 201


@recipes_bp.put("/<int:recipe_id>/rating")
@jwt_required()
def upsert_rating(recipe_id: int):
    recipe = _get_recipe_or_404(recipe_id)
    _require_recipe_view(recipe)
    require_approved_recipe(recipe)

    user_id = int(get_jwt_identity())
    if int(recipe.owner_id) == user_id:
        raise APIError("Не можна оцінювати власний рецепт", 409)

    value = _parse_rating_value(request.get_json(silent=True) or {})

    rating = Rating.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()
    if rating:
        rating.value = value
    else:
        rating = Rating(value=value, user_id=user_id, recipe_id=recipe_id)
        db.session.add(rating)

    db.session.commit()
    return jsonify(
        {
            "message": "Оцінку збережено",
            "recipe": recipe_to_dict_with_ratings(recipe, current_user_id=user_id),
        }
    )


@recipes_bp.delete("/<int:recipe_id>/rating")
@jwt_required()
def delete_rating(recipe_id: int):
    user_id = int(get_jwt_identity())
    rating = Rating.query.filter_by(user_id=user_id, recipe_id=recipe_id).first()
    if not rating:
        return jsonify({"message": "Оцінку не знайдено"}), 200

    recipe = Recipe.query.get(recipe_id)
    db.session.delete(rating)
    db.session.commit()

    payload = {"message": "Оцінку видалено"}
    if recipe:
        payload["recipe"] = recipe_to_dict_with_ratings(recipe, current_user_id=user_id)
    return jsonify(payload)


@recipes_bp.post("/<int:recipe_id>/save")
@jwt_required()
def save_recipe(recipe_id: int):
    recipe = _get_recipe_or_404(recipe_id)
    _require_recipe_view(recipe)
    require_approved_recipe(recipe)

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

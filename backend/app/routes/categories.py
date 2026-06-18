from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..authz import require_admin
from ..errors import APIError
from ..extensions import db
from ..models import Category
from ..routes.uploads import validate_uploaded_image
from ..storage import save_image

categories_bp = Blueprint("categories", __name__)

CATEGORY_ICON_COUNT = 8


def _get_category_or_404(category_id: int) -> Category:
    category = Category.query.get(category_id)
    if not category:
        raise APIError("Категорію не знайдено", 404)
    return category


def _parse_icon_index(raw) -> int:
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise APIError("Некоректне значення icon_index", 400)
    if value < 0 or value >= CATEGORY_ICON_COUNT:
        raise APIError(f"icon_index має бути від 0 до {CATEGORY_ICON_COUNT - 1}", 400)
    return value


@categories_bp.get("")
def list_categories():
    items = Category.query.order_by(Category.name.asc()).all()
    return jsonify({"items": [c.to_dict(include_recipe_count=True) for c in items]})


@categories_bp.post("")
@jwt_required()
def create_category():
    require_admin()
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    if not name:
        raise APIError("Некоректні дані", 400, details={"missing": ["name"]})

    exists = Category.query.filter(Category.name.ilike(name)).first()
    if exists:
        raise APIError("Така категорія вже існує", 409)

    icon_index = 0
    if "icon_index" in data:
        icon_index = _parse_icon_index(data.get("icon_index"))

    category = Category(name=name, icon_index=icon_index)
    db.session.add(category)
    db.session.commit()
    return jsonify({"message": "Категорію успішно створено", "category": category.to_dict()}), 201


@categories_bp.put("/<int:category_id>")
@jwt_required()
def update_category(category_id: int):
    require_admin()
    category = _get_category_or_404(category_id)
    data = request.get_json(silent=True) or {}

    if "name" in data:
        name = str(data.get("name", "")).strip()
        if not name:
            raise APIError("Некоректні дані", 400, details={"missing": ["name"]})
        exists = Category.query.filter(Category.id != category.id, Category.name.ilike(name)).first()
        if exists:
            raise APIError("Така категорія вже існує", 409)
        category.name = name

    if "icon_index" in data:
        category.icon_index = _parse_icon_index(data.get("icon_index"))

    if "image_url" in data:
        raw = data.get("image_url")
        category.image_url = str(raw).strip() if raw else None

    db.session.commit()
    return jsonify({"message": "Категорію оновлено", "category": category.to_dict()})


@categories_bp.post("/<int:category_id>/image")
@jwt_required()
def upload_category_image(category_id: int):
    require_admin()
    category = _get_category_or_404(category_id)
    file = request.files.get("file")
    ext, _kind = validate_uploaded_image(file)
    url = save_image(file, subdir="categories", prefix="category", ext=ext)
    category.image_url = url
    db.session.commit()
    return jsonify({"message": "Зображення категорії оновлено", "category": category.to_dict()}), 201


@categories_bp.delete("/<int:category_id>")
@jwt_required()
def delete_category(category_id: int):
    require_admin()
    category = _get_category_or_404(category_id)

    if category.recipes and len(category.recipes) > 0:
        raise APIError("Неможливо видалити категорію, яка використовується в рецептах", 409)

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Категорію успішно видалено"})

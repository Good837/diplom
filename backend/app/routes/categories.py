from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..errors import APIError
from ..extensions import db
from ..models import Category
from ..authz import require_admin

categories_bp = Blueprint("categories", __name__)

@categories_bp.get("")
def list_categories():
    items = Category.query.order_by(Category.name.asc()).all()
    return jsonify({"items": [c.to_dict() for c in items]})


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

    category = Category(name=name)
    db.session.add(category)
    db.session.commit()
    return jsonify({"message": "Категорію успішно створено", "category": category.to_dict()}), 201


@categories_bp.delete("/<int:category_id>")
@jwt_required()
def delete_category(category_id: int):
    require_admin()
    category = Category.query.get(category_id)
    if not category:
        raise APIError("Категорію не знайдено", 404)

    # Deletion policy: block if there are recipes using this category.
    if category.recipes and len(category.recipes) > 0:
        raise APIError("Неможливо видалити категорію, яка використовується в рецептах", 409)

    db.session.delete(category)
    db.session.commit()
    return jsonify({"message": "Категорію успішно видалено"})

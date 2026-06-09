from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..authz import require_admin
from ..errors import APIError
from ..models import Comment, Recipe

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

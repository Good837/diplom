from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required

from ..authz import get_current_user
from ..errors import APIError
from ..extensions import db
from ..models import Comment

comments_bp = Blueprint("comments", __name__)


@comments_bp.put("/<int:comment_id>")
@jwt_required()
def update_comment(comment_id: int):
    comment = Comment.query.get(comment_id)
    if not comment:
        raise APIError("Коментар не знайдено", 404)

    user = get_current_user()
    if int(comment.author_id) != int(user.id):
        raise APIError("Недостатньо прав для цієї дії", 403)

    data = request.get_json(silent=True) or {}
    body = str(data.get("body") or "").strip()
    if not body:
        raise APIError("Некоректні дані", 400, details={"missing": ["body"]})

    comment.body = body
    db.session.commit()
    return jsonify({"message": "Коментар оновлено", "comment": comment.to_dict()})


@comments_bp.delete("/<int:comment_id>")
@jwt_required()
def delete_comment(comment_id: int):
    comment = Comment.query.get(comment_id)
    if not comment:
        raise APIError("Коментар не знайдено", 404)

    user = get_current_user()
    if not (user.is_admin or int(comment.author_id) == int(user.id)):
        raise APIError("Недостатньо прав для цієї дії", 403)

    db.session.delete(comment)
    db.session.commit()
    return jsonify({"message": "Коментар успішно видалено"})


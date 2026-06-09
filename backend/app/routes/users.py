from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request
from sqlalchemy import or_

from ..authz import get_current_user, require_admin
from ..errors import APIError
from ..extensions import db
from ..models import Comment, Recipe, SavedRecipe, User
from ..ratings import recipes_to_dicts_with_ratings

users_bp = Blueprint("users", __name__)


def _int_query(name: str, default: int) -> int:
    raw = request.args.get(name, None)
    if raw is None or raw == "":
        return default
    try:
        return int(raw)
    except ValueError:
        raise APIError(f"Некоректне значення параметра '{name}'", 400)


def _optional_viewer_id() -> int | None:
    verify_jwt_in_request(optional=True)
    identity = get_jwt_identity()
    return int(identity) if identity is not None else None


def _can_view_profile_content(user: User, viewer_id: int | None) -> bool:
    if not user.is_private:
        return True
    return viewer_id is not None and int(viewer_id) == int(user.id)


def _ordered_saved_recipes(user_id: int) -> list[Recipe]:
    rows = (
        SavedRecipe.query.filter(SavedRecipe.user_id == user_id)
        .order_by(SavedRecipe.created_at.desc())
        .all()
    )
    recipe_ids = [r.recipe_id for r in rows]
    if not recipe_ids:
        return []

    recipes = Recipe.query.filter(Recipe.id.in_(recipe_ids)).all()
    by_id = {r.id: r for r in recipes}
    return [by_id[rid] for rid in recipe_ids if rid in by_id]


def _profile_comments(user_id: int) -> list[dict]:
    comments = (
        Comment.query.filter(Comment.author_id == user_id)
        .order_by(Comment.created_at.desc())
        .all()
    )
    items = []
    for comment in comments:
        data = comment.to_dict()
        if comment.recipe:
            data["recipe"] = {"id": comment.recipe.id, "title": comment.recipe.title}
        items.append(data)
    return items


@users_bp.get("")
@jwt_required()
def admin_list_users():
    require_admin()
    q = (request.args.get("q") or "").strip()
    page = max(1, _int_query("page", 1))
    per_page = _int_query("per_page", 20)
    per_page = max(1, min(100, per_page))

    query = User.query
    if q:
        like = f"%{q}%"
        query = query.filter(or_(User.username.ilike(like), User.email.ilike(like), User.display_name.ilike(like)))

    query = query.order_by(User.created_at.desc())
    pagination = query.paginate(page=page, per_page=per_page, error_out=False)
    items = [u.to_private_dict() for u in pagination.items]
    return jsonify(
        {
            "items": items,
            "page": page,
            "per_page": per_page,
            "total": pagination.total,
            "pages": pagination.pages,
        }
    )


@users_bp.delete("/<int:user_id>")
@jwt_required()
def admin_delete_user(user_id: int):
    require_admin()
    current = get_current_user()
    if int(current.id) == int(user_id):
        raise APIError("Неможливо видалити власний акаунт адміністратора", 409)

    user = User.query.get(user_id)
    if not user:
        raise APIError("Користувача не знайдено", 404)

    db.session.delete(user)
    db.session.commit()
    return jsonify({"message": "Користувача успішно видалено"})


@users_bp.get("/me")
@jwt_required()
def me():
    user = get_current_user()
    return jsonify({"user": user.to_private_dict()})


@users_bp.put("/me")
@jwt_required()
def update_me():
    user = get_current_user()
    data = request.get_json(silent=True) or {}

    if "display_name" in data:
        user.display_name = str(data.get("display_name") or "").strip()

    if "bio" in data:
        user.bio = str(data.get("bio") or "").strip()

    if "username" in data:
        username = str(data.get("username") or "").strip()
        if not username:
            raise APIError("Некоректні дані", 400, details={"missing": ["username"]})
        exists = User.query.filter(User.username == username, User.id != user.id).first()
        if exists:
            raise APIError("Це ім'я користувача вже зайняте", 409)
        user.username = username

    if "is_private" in data:
        raw = data.get("is_private")
        if not isinstance(raw, bool):
            raise APIError("Поле 'is_private' має бути логічним значенням (true/false)", 400)
        user.is_private = raw

    db.session.commit()
    return jsonify({"message": "Профіль оновлено", "user": user.to_private_dict()})


@users_bp.get("/me/saved")
@jwt_required()
def my_saved():
    user = get_current_user()
    ordered = _ordered_saved_recipes(user.id)
    return jsonify({"items": recipes_to_dicts_with_ratings(ordered, current_user_id=user.id)})


@users_bp.get("/me/comments")
@jwt_required()
def my_comments():
    user = get_current_user()
    return jsonify({"items": _profile_comments(user.id)})


@users_bp.get("/<string:username>")
def public_profile(username: str):
    username = (username or "").strip()
    if not username:
        raise APIError("Ресурс не знайдено", 404)
    user = User.query.filter_by(username=username).first()
    if not user:
        raise APIError("Користувача не знайдено", 404)

    viewer_id = _optional_viewer_id()
    can_view = _can_view_profile_content(user, viewer_id)

    profile = {
        **user.to_public_dict(),
        "member_since": user.created_at.isoformat() if user.created_at else None,
    }

    if can_view:
        recipes = Recipe.query.filter(Recipe.owner_id == user.id).order_by(Recipe.created_at.desc()).all()
        saved = _ordered_saved_recipes(user.id)
        profile["recipe_count"] = len(recipes)
        profile["saved_count"] = len(saved)
        profile["comment_count"] = Comment.query.filter(Comment.author_id == user.id).count()
        return jsonify(
            {
                "user": profile,
                "recipes": recipes_to_dicts_with_ratings(recipes, current_user_id=viewer_id),
                "saved": recipes_to_dicts_with_ratings(saved, current_user_id=viewer_id),
                "comments": _profile_comments(user.id),
            }
        )

    return jsonify({"user": profile, "recipes": [], "saved": [], "comments": []})

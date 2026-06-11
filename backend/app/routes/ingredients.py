from __future__ import annotations

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request

from ..errors import APIError
from ..ingredients import query_distinct_ingredient_names

ingredients_bp = Blueprint("ingredients", __name__)


def _int_query(name: str, default: int) -> int:
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


@ingredients_bp.get("")
def list_ingredients():
    items = query_distinct_ingredient_names()
    return jsonify({"items": items})


@ingredients_bp.get("/suggest")
def suggest_ingredients():
    q = (request.args.get("q") or "").strip()
    if len(q) < 2:
        raise APIError("Введіть щонайменше 2 символи для пошуку", 400)

    limit = _int_query("limit", 10)
    limit = max(1, min(25, limit))

    items = query_distinct_ingredient_names(
        prefix=q,
        exclude_owner_id=_optional_user_id(),
        limit=limit,
    )
    return jsonify({"items": items})

from __future__ import annotations

from flask import Blueprint, jsonify, request

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

    items = query_distinct_ingredient_names(prefix=q, limit=limit)
    return jsonify({"items": items})

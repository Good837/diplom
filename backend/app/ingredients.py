from __future__ import annotations

from decimal import Decimal, InvalidOperation

from sqlalchemy import func

from .errors import APIError
from .extensions import db
from .models import Recipe, RecipeIngredient, RecipeStatus

ALLOWED_UNITS = ["г", "кг", "мл", "л", "шт", "ст.л", "ч.л", "склянка", "пучок", "за смаком"]


def parse_ingredients_payload(raw) -> list[dict]:
    if raw is None or raw == "":
        raise APIError("Додайте хоча б один інгредієнт", 400)
    if not isinstance(raw, list):
        raise APIError("Поле 'ingredients' має бути масивом", 400)
    if not raw:
        raise APIError("Додайте хоча б один інгредієнт", 400)

    parsed: list[dict] = []
    for idx, item in enumerate(raw):
        label = f"Інгредієнт #{idx + 1}"
        if not isinstance(item, dict):
            raise APIError(f"{label}: некоректний формат", 400)

        name = str(item.get("name") or "").strip()
        if not name:
            raise APIError(f"{label}: назва не може бути порожньою", 400)
        if len(name) > 120:
            raise APIError(f"{label}: назва занадто довга (максимум 120 символів)", 400)

        unit = str(item.get("unit") or "шт").strip()
        if unit not in ALLOWED_UNITS:
            raise APIError(f"{label}: недопустима одиниця виміру", 400)

        amount_raw = item.get("amount")
        if unit == "за смаком":
            amount = None
        elif amount_raw is None:
            amount = None
        else:
            try:
                amount = Decimal(str(amount_raw))
            except (InvalidOperation, TypeError, ValueError):
                raise APIError(f"{label}: кількість має бути числом", 400)
            if amount < 0:
                raise APIError(f"{label}: кількість не може бути від'ємною", 400)

        parsed.append({"name": name, "amount": amount, "unit": unit})

    return parsed


def format_ingredient_line(ingredient) -> str:
    name = getattr(ingredient, "name", "") or ""
    unit = getattr(ingredient, "unit", "") or ""
    amount = getattr(ingredient, "amount", None)

    if unit == "за смаком" or amount is None:
        return f"{name} — за смаком"

    value = float(amount)
    if value == int(value):
        amount_text = str(int(value))
    else:
        amount_text = str(value).rstrip("0").rstrip(".")
    return f"{name} — {amount_text} {unit}"


def aggregate_ingredients(recipes: list) -> list[dict]:
    """Merge ingredient lines from multiple recipes; key is normalized lowercase text."""
    buckets: dict[str, dict] = {}

    for recipe in recipes:
        title = getattr(recipe, "title", None) or "Рецепт"
        for ing in getattr(recipe, "ingredients", []) or []:
            line = format_ingredient_line(ing)
            key = line.casefold()
            if key not in buckets:
                buckets[key] = {"text": line, "count": 0, "sources": []}
            buckets[key]["count"] += 1
            if title not in buckets[key]["sources"]:
                buckets[key]["sources"].append(title)

    return sorted(buckets.values(), key=lambda x: x["text"].casefold())


def query_distinct_ingredient_names(
    *,
    prefix: str | None = None,
    exclude_owner_id: int | None = None,
    limit: int | None = None,
) -> list[str]:
    normalized = func.lower(RecipeIngredient.name)
    canonical = func.min(RecipeIngredient.name)

    query = (
        db.session.query(canonical.label("name"))
        .join(Recipe, Recipe.id == RecipeIngredient.recipe_id)
        .filter(Recipe.status == RecipeStatus.approved)
    )

    if exclude_owner_id is not None:
        query = query.filter(Recipe.owner_id != int(exclude_owner_id))

    prefix_text = (prefix or "").strip()
    if prefix_text:
        query = query.filter(RecipeIngredient.name.ilike(f"%{prefix_text}%"))

    query = query.group_by(normalized).order_by(normalized.asc())

    if limit is not None:
        query = query.limit(max(1, int(limit)))

    return [row.name for row in query.all() if row.name]

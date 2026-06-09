from __future__ import annotations

from sqlalchemy import func

from .extensions import db
from .models import Rating


def rating_stats_for_recipe_ids(recipe_ids: list[int]) -> dict[int, dict]:
    if not recipe_ids:
        return {}

    rows = (
        db.session.query(
            Rating.recipe_id,
            func.avg(Rating.value).label("avg"),
            func.count(Rating.id).label("count"),
        )
        .filter(Rating.recipe_id.in_(recipe_ids))
        .group_by(Rating.recipe_id)
        .all()
    )

    stats: dict[int, dict] = {}
    for recipe_id, avg, count in rows:
        stats[int(recipe_id)] = {
            "rating_avg": round(float(avg), 1) if avg is not None else None,
            "rating_count": int(count or 0),
        }
    return stats


def my_ratings_for_recipe_ids(user_id: int, recipe_ids: list[int]) -> dict[int, int]:
    if not recipe_ids:
        return {}

    rows = (
        Rating.query.filter(Rating.user_id == user_id, Rating.recipe_id.in_(recipe_ids))
        .with_entities(Rating.recipe_id, Rating.value)
        .all()
    )
    return {int(recipe_id): int(value) for recipe_id, value in rows}


def recipe_to_dict_with_ratings(recipe, *, current_user_id: int | None = None) -> dict:
    stats = rating_stats_for_recipe_ids([recipe.id]).get(recipe.id, {})
    my_rating = None
    if current_user_id is not None:
        my_rating = my_ratings_for_recipe_ids(current_user_id, [recipe.id]).get(recipe.id)
    return recipe.to_dict(
        rating_avg=stats.get("rating_avg"),
        rating_count=stats.get("rating_count", 0),
        my_rating=my_rating,
    )


def recipes_to_dicts_with_ratings(recipes: list, *, current_user_id: int | None = None) -> list[dict]:
    if not recipes:
        return []

    ids = [r.id for r in recipes]
    stats = rating_stats_for_recipe_ids(ids)
    my_map = my_ratings_for_recipe_ids(current_user_id, ids) if current_user_id is not None else {}

    result = []
    for recipe in recipes:
        s = stats.get(recipe.id, {})
        result.append(
            recipe.to_dict(
                rating_avg=s.get("rating_avg"),
                rating_count=s.get("rating_count", 0),
                my_rating=my_map.get(recipe.id),
            )
        )
    return result

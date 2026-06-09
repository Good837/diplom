from __future__ import annotations

from decimal import Decimal

import click
from flask import Flask

from .extensions import db
from .models import Category, Recipe, RecipeIngredient, User
from .passwords import hash_password
from .seed_data import CATEGORIES, DEMO_USER, RECIPES


def _ensure_demo_user() -> tuple[User, bool]:
    user = User.query.filter_by(username=DEMO_USER["username"]).first()
    if user:
        return user, False

    user = User(
        username=DEMO_USER["username"],
        email=DEMO_USER["email"],
        password_hash=hash_password(DEMO_USER["password"]),
        display_name=DEMO_USER["display_name"],
        bio=DEMO_USER["bio"],
        email_verified=True,
        is_private=False,
        is_admin=False,
    )
    db.session.add(user)
    db.session.flush()
    return user, True


def _ensure_categories() -> tuple[dict[str, Category], int]:
    by_name: dict[str, Category] = {}
    created = 0

    for name in CATEGORIES:
        category = Category.query.filter_by(name=name).first()
        if not category:
            category = Category(name=name)
            db.session.add(category)
            db.session.flush()
            created += 1
        by_name[name] = category

    return by_name, created


def _ensure_recipes(owner: User, categories: dict[str, Category]) -> int:
    created = 0

    for (
        category_name,
        title,
        description,
        instructions,
        cooking_time,
        ingredients,
    ) in RECIPES:
        exists = Recipe.query.filter_by(owner_id=owner.id, title=title).first()
        if exists:
            continue

        category = categories.get(category_name)
        if not category:
            continue

        recipe = Recipe(
            title=title,
            description=description,
            instructions=instructions,
            cooking_time=cooking_time,
            owner_id=owner.id,
            category_id=category.id,
        )
        db.session.add(recipe)
        db.session.flush()

        for position, (name, amount, unit) in enumerate(ingredients):
            recipe.ingredients.append(
                RecipeIngredient(
                    name=name,
                    amount=Decimal(str(amount)) if amount is not None else None,
                    unit=unit,
                    position=position,
                )
            )
        created += 1

    return created


def run_seed() -> dict[str, int]:
    user, user_created = _ensure_demo_user()
    categories, categories_created = _ensure_categories()
    recipes_created = _ensure_recipes(user, categories)
    db.session.commit()

    return {
        "users_created": int(user_created),
        "categories_created": categories_created,
        "recipes_created": recipes_created,
        "categories_total": len(categories),
        "recipes_total": Recipe.query.filter_by(owner_id=user.id).count(),
    }


def register_seed_command(app: Flask) -> None:
    @app.cli.command("seed")
    @click.option(
        "--show-credentials",
        is_flag=True,
        default=False,
        help="Показати дані демо-акаунта після сідингу.",
    )
    def seed_command(show_credentials: bool) -> None:
        """Додати демо-категорії та рецепти (ідемпотентно)."""
        stats = run_seed()
        click.echo(
            "Сідинг завершено: "
            f"користувачів +{stats['users_created']}, "
            f"категорій +{stats['categories_created']} (усього {stats['categories_total']}), "
            f"рецептів +{stats['recipes_created']} (усього {stats['recipes_total']})."
        )
        if show_credentials or stats["users_created"]:
            click.echo(
                f"Демо-акаунт: {DEMO_USER['username']} / {DEMO_USER['email']} "
                f"(пароль: {DEMO_USER['password']})"
            )

from __future__ import annotations

from datetime import datetime, timezone

from decimal import Decimal

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Numeric, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .extensions import db


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(120), nullable=False, server_default="")
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    bio: Mapped[str] = mapped_column(Text, nullable=False, server_default="")
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_private: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    recipes: Mapped[list["Recipe"]] = relationship(back_populates="owner", cascade="all, delete-orphan")
    comments: Mapped[list["Comment"]] = relationship(back_populates="author", cascade="all, delete-orphan")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    shopping_list_entries: Mapped[list["ShoppingListRecipe"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )
    email_verification_tokens: Mapped[list["EmailVerificationToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )

    def to_public_dict(self) -> dict:
        return {
            "id": self.id,
            "username": self.username,
            "display_name": self.display_name,
            "bio": self.bio,
            "avatar_url": self.avatar_url,
            "is_private": bool(self.is_private),
        }

    def to_private_dict(self) -> dict:
        return {
            **self.to_public_dict(),
            "email": self.email,
            "is_admin": bool(self.is_admin),
            "email_verified": bool(self.email_verified),
        }


class EmailVerificationToken(db.Model):
    __tablename__ = "email_verification_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped["User"] = relationship(back_populates="email_verification_tokens")


class Category(db.Model):
    __tablename__ = "categories"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    recipes: Mapped[list["Recipe"]] = relationship(back_populates="category")

    def to_dict(self, *, include_recipe_count: bool = False) -> dict:
        data = {"id": self.id, "name": self.name}
        if include_recipe_count:
            data["recipe_count"] = len(self.recipes) if self.recipes is not None else 0
        return data


class Recipe(db.Model):
    __tablename__ = "recipes"
    __table_args__ = (UniqueConstraint("owner_id", "title", name="uq_recipe_owner_title"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    instructions: Mapped[str] = mapped_column(Text, nullable=False)
    cooking_time: Mapped[int] = mapped_column(Integer, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("categories.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=utcnow,
    )

    owner: Mapped[User] = relationship(back_populates="recipes")
    category: Mapped[Category] = relationship(back_populates="recipes")
    ingredients: Mapped[list["RecipeIngredient"]] = relationship(
        back_populates="recipe",
        cascade="all, delete-orphan",
        order_by="RecipeIngredient.position",
    )
    comments: Mapped[list["Comment"]] = relationship(back_populates="recipe", cascade="all, delete-orphan")
    ratings: Mapped[list["Rating"]] = relationship(back_populates="recipe", cascade="all, delete-orphan")

    def to_dict(
        self,
        *,
        rating_avg: float | None = None,
        rating_count: int = 0,
        my_rating: int | None = None,
    ) -> dict:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "ingredients": [
                {
                    "name": item.name,
                    "amount": float(item.amount) if item.amount is not None else None,
                    "unit": item.unit,
                }
                for item in self.ingredients
            ],
            "instructions": self.instructions,
            "cooking_time": self.cooking_time,
            "image_url": self.image_url,
            "owner": self.owner.to_public_dict() if self.owner else None,
            "category": self.category.to_dict() if self.category else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "rating_avg": rating_avg,
            "rating_count": rating_count,
            "my_rating": my_rating,
        }


class RecipeIngredient(db.Model):
    __tablename__ = "recipe_ingredients"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    amount: Mapped[Decimal | None] = mapped_column(Numeric(8, 2), nullable=True)
    unit: Mapped[str] = mapped_column(String(20), nullable=False, server_default="шт")
    position: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    recipe: Mapped["Recipe"] = relationship(back_populates="ingredients")


class Comment(db.Model):
    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)

    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    author_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=utcnow,
    )

    recipe: Mapped[Recipe] = relationship(back_populates="comments")
    author: Mapped[User] = relationship(back_populates="comments")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "body": self.body,
            "author": self.author.to_public_dict() if self.author else None,
            "recipe_id": self.recipe_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
        }


class Rating(db.Model):
    __tablename__ = "ratings"
    __table_args__ = (UniqueConstraint("user_id", "recipe_id", name="uq_rating_user_recipe"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    value: Mapped[int] = mapped_column(Integer, nullable=False)

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipe_id: Mapped[int] = mapped_column(
        ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=utcnow,
    )

    user: Mapped[User] = relationship(back_populates="ratings")
    recipe: Mapped[Recipe] = relationship(back_populates="ratings")


class SavedRecipe(db.Model):
    __tablename__ = "saved_recipes"
    __table_args__ = (UniqueConstraint("user_id", "recipe_id", name="uq_saved_user_recipe"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = relationship()
    recipe: Mapped[Recipe] = relationship()


class ShoppingListRecipe(db.Model):
    __tablename__ = "shopping_list_recipes"
    __table_args__ = (UniqueConstraint("user_id", "recipe_id", name="uq_shopping_user_recipe"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    recipe_id: Mapped[int] = mapped_column(ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    user: Mapped[User] = relationship(back_populates="shopping_list_entries")
    recipe: Mapped[Recipe] = relationship()

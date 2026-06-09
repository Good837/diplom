"""shopping list recipes

Revision ID: c4d9e2a81703
Revises: b8e3a1f20452
Create Date: 2026-06-04

"""

from alembic import op
import sqlalchemy as sa


revision = "c4d9e2a81703"
down_revision = "b8e3a1f20452"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "shopping_list_recipes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "recipe_id", name="uq_shopping_user_recipe"),
    )
    op.create_index(op.f("ix_shopping_list_recipes_user_id"), "shopping_list_recipes", ["user_id"], unique=False)
    op.create_index(op.f("ix_shopping_list_recipes_recipe_id"), "shopping_list_recipes", ["recipe_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_shopping_list_recipes_recipe_id"), table_name="shopping_list_recipes")
    op.drop_index(op.f("ix_shopping_list_recipes_user_id"), table_name="shopping_list_recipes")
    op.drop_table("shopping_list_recipes")

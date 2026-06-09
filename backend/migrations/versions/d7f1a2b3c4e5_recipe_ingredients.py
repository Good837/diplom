"""recipe ingredients

Revision ID: d7f1a2b3c4e5
Revises: c4d9e2a81703
Create Date: 2026-06-07

"""

from alembic import op
import sqlalchemy as sa


revision = "d7f1a2b3c4e5"
down_revision = "c4d9e2a81703"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "recipe_ingredients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("amount", sa.Numeric(precision=8, scale=2), nullable=True),
        sa.Column("unit", sa.String(length=20), server_default="шт", nullable=False),
        sa.Column("position", sa.Integer(), server_default="0", nullable=False),
    )
    op.create_index(op.f("ix_recipe_ingredients_recipe_id"), "recipe_ingredients", ["recipe_id"], unique=False)
    op.drop_column("recipes", "ingredients")


def downgrade():
    op.add_column("recipes", sa.Column("ingredients", sa.Text(), nullable=False, server_default=""))
    op.drop_index(op.f("ix_recipe_ingredients_recipe_id"), table_name="recipe_ingredients")
    op.drop_table("recipe_ingredients")

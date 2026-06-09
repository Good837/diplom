"""recipe ratings

Revision ID: b8e3a1f20452
Revises: 4c2f7c8b9e11
Create Date: 2026-06-04

"""

from alembic import op
import sqlalchemy as sa


revision = "b8e3a1f20452"
down_revision = "4c2f7c8b9e11"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "ratings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("value", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "recipe_id", name="uq_rating_user_recipe"),
    )
    op.create_index(op.f("ix_ratings_user_id"), "ratings", ["user_id"], unique=False)
    op.create_index(op.f("ix_ratings_recipe_id"), "ratings", ["recipe_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_ratings_recipe_id"), table_name="ratings")
    op.drop_index(op.f("ix_ratings_user_id"), table_name="ratings")
    op.drop_table("ratings")

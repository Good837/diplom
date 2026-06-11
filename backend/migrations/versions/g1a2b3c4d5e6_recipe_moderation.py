"""recipe moderation status

Revision ID: g1a2b3c4d5e6
Revises: f3b8c2d1e4a7
Create Date: 2026-06-11

"""

from alembic import op
import sqlalchemy as sa


revision = "g1a2b3c4d5e6"
down_revision = "f3b8c2d1e4a7"
branch_labels = None
depends_on = None

recipe_status = sa.Enum("pending", "approved", "rejected", name="recipe_status")


def upgrade():
    recipe_status.create(op.get_bind(), checkfirst=True)
    op.add_column(
        "recipes",
        sa.Column("status", recipe_status, server_default="approved", nullable=False),
    )
    op.create_index("ix_recipes_status", "recipes", ["status"])


def downgrade():
    op.drop_index("ix_recipes_status", table_name="recipes")
    op.drop_column("recipes", "status")
    recipe_status.drop(op.get_bind(), checkfirst=True)

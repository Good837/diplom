"""category image and icon

Revision ID: h2b3c4d5e6f7
Revises: g1a2b3c4d5e6
Create Date: 2026-06-12

"""

from alembic import op
import sqlalchemy as sa


revision = "h2b3c4d5e6f7"
down_revision = "g1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("categories", sa.Column("image_url", sa.String(length=500), nullable=True))
    op.add_column(
        "categories",
        sa.Column("icon_index", sa.Integer(), nullable=False, server_default="0"),
    )


def downgrade():
    op.drop_column("categories", "icon_index")
    op.drop_column("categories", "image_url")

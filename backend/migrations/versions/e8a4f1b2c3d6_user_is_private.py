"""user is_private

Revision ID: e8a4f1b2c3d6
Revises: d7f1a2b3c4e5
Create Date: 2026-06-07

"""

from alembic import op
import sqlalchemy as sa


revision = "e8a4f1b2c3d6"
down_revision = "d7f1a2b3c4e5"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("is_private", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade():
    op.drop_column("users", "is_private")

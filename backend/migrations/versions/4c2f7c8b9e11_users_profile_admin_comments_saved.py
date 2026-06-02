"""users profile fields, admin flag, comments, saved recipes

Revision ID: 4c2f7c8b9e11
Revises: a4740ddcc400
Create Date: 2026-04-27

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "4c2f7c8b9e11"
down_revision = "a4740ddcc400"
branch_labels = None
depends_on = None


def upgrade():
    # users: profile fields + admin flag
    op.add_column("users", sa.Column("display_name", sa.String(length=120), nullable=False, server_default=""))
    op.add_column("users", sa.Column("bio", sa.Text(), nullable=False, server_default=""))
    op.add_column("users", sa.Column("avatar_url", sa.String(length=500), nullable=True))
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")))

    # comments
    op.create_table(
        "comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(op.f("ix_comments_recipe_id"), "comments", ["recipe_id"], unique=False)
    op.create_index(op.f("ix_comments_author_id"), "comments", ["author_id"], unique=False)

    # saved recipes (favorites)
    op.create_table(
        "saved_recipes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recipe_id", sa.Integer(), sa.ForeignKey("recipes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.UniqueConstraint("user_id", "recipe_id", name="uq_saved_user_recipe"),
    )
    op.create_index(op.f("ix_saved_recipes_user_id"), "saved_recipes", ["user_id"], unique=False)
    op.create_index(op.f("ix_saved_recipes_recipe_id"), "saved_recipes", ["recipe_id"], unique=False)


def downgrade():
    op.drop_index(op.f("ix_saved_recipes_recipe_id"), table_name="saved_recipes")
    op.drop_index(op.f("ix_saved_recipes_user_id"), table_name="saved_recipes")
    op.drop_table("saved_recipes")

    op.drop_index(op.f("ix_comments_author_id"), table_name="comments")
    op.drop_index(op.f("ix_comments_recipe_id"), table_name="comments")
    op.drop_table("comments")

    op.drop_column("users", "is_admin")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "bio")
    op.drop_column("users", "display_name")


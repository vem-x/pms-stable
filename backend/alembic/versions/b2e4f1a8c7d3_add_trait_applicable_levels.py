"""add applicable_levels to review_traits

Revision ID: b2e4f1a8c7d3
Revises: a7b3c1d9e5f2
Create Date: 2026-03-02 00:01:00.000000

Adds:
  - applicable_levels: JSON (nullable) — list of integer grade levels (1-17)
    NULL means the trait applies to all grade levels.
"""

from alembic import op
import sqlalchemy as sa


revision: str = 'b2e4f1a8c7d3'
down_revision: str = 'a7b3c1d9e5f2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'review_traits',
        sa.Column('applicable_levels', sa.JSON(), nullable=True)
    )


def downgrade() -> None:
    op.drop_column('review_traits', 'applicable_levels')

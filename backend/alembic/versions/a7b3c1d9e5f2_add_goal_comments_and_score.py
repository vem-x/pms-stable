"""add goal comments and supervisor score

Revision ID: a7b3c1d9e5f2
Revises: c9f4e2b8a1d3
Create Date: 2026-03-01 00:01:00.000000

Adds three new nullable columns to the goals table:
  - employee_comment: TEXT  — employee's note when completing a goal
  - supervisor_comment: TEXT — supervisor's comment when scoring a goal
  - supervisor_score: FLOAT  — supervisor's manual 0–5 score
"""

from alembic import op
import sqlalchemy as sa


revision: str = 'a7b3c1d9e5f2'
down_revision: str = 'c9f4e2b8a1d3'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('goals', sa.Column('employee_comment', sa.Text(), nullable=True))
    op.add_column('goals', sa.Column('supervisor_comment', sa.Text(), nullable=True))
    op.add_column('goals', sa.Column('supervisor_score', sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column('goals', 'supervisor_score')
    op.drop_column('goals', 'supervisor_comment')
    op.drop_column('goals', 'employee_comment')

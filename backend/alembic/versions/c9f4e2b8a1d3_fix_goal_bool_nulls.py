"""fix goal bool null columns

Revision ID: c9f4e2b8a1d3
Revises: fa88177f1e32
Create Date: 2026-03-01 00:00:00.000000

The `achieved` and `frozen` boolean columns on the goals table may contain
NULL for rows that pre-date the NOT NULL constraint being enforced.
This crashes the Pydantic serialiser with:
  "Input should be a valid boolean [input_value=None]"

This migration:
  1. Adds `achieved` if missing, else backfills NULLs → FALSE.
  2. Adds `frozen`   if missing, else backfills NULLs → FALSE.
  3. Enforces NOT NULL on both columns.

Safe to run regardless of which prior migrations were applied.
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text


revision: str = 'c9f4e2b8a1d3'
down_revision = None
branch_labels = None
depends_on = None


def _column_exists(bind, table: str, column: str) -> bool:
    row = bind.execute(text(
        "SELECT 1 FROM information_schema.columns "
        "WHERE table_name = :t AND column_name = :c"
    ), {"t": table, "c": column}).fetchone()
    return row is not None


def upgrade() -> None:
    bind = op.get_bind()

    # ── achieved ─────────────────────────────────────────────────────────────
    if not _column_exists(bind, 'goals', 'achieved'):
        op.add_column(
            'goals',
            sa.Column('achieved', sa.Boolean(), nullable=False,
                      server_default='false')
        )
    else:
        bind.execute(text(
            "UPDATE goals SET achieved = FALSE WHERE achieved IS NULL"
        ))
        try:
            op.alter_column('goals', 'achieved', nullable=False,
                            server_default='false')
        except Exception:
            pass  # Already NOT NULL

    # ── frozen ────────────────────────────────────────────────────────────────
    if not _column_exists(bind, 'goals', 'frozen'):
        op.add_column(
            'goals',
            sa.Column('frozen', sa.Boolean(), nullable=False,
                      server_default='false')
        )
    else:
        bind.execute(text(
            "UPDATE goals SET frozen = FALSE WHERE frozen IS NULL"
        ))
        try:
            op.alter_column('goals', 'frozen', nullable=False,
                            server_default='false')
        except Exception:
            pass  # Already NOT NULL


def downgrade() -> None:
    # These are data-integrity fixes — downgrade is intentionally a no-op.
    pass

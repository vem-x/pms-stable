"""rename_approved_to_completed_in_initiativestatus

Revision ID: 5c516a9f6340
Revises: 85729ed5e946
Create Date: 2025-12-17 10:13:41.308950

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5c516a9f6340'
down_revision: Union[str, None] = '85729ed5e946'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename approved_at to completed_at in initiatives table
    op.execute('ALTER TABLE initiatives RENAME COLUMN approved_at TO completed_at')


def downgrade() -> None:
    # Revert: rename completed_at back to approved_at
    op.execute('ALTER TABLE initiatives RENAME COLUMN completed_at TO approved_at')

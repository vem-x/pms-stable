"""add_scheduled_status_to_reviewcyclestatus

Revision ID: a493b0d6cda2
Revises: 7a96cbd2ed80
Create Date: 2025-12-16 21:33:43.307546

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a493b0d6cda2'
down_revision: Union[str, None] = '7a96cbd2ed80'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'scheduled' to the reviewcyclestatus enum
    op.execute("ALTER TYPE reviewcyclestatus ADD VALUE IF NOT EXISTS 'scheduled'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum without the value
    pass

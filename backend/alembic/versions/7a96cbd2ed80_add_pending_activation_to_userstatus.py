"""add_pending_activation_to_userstatus

Revision ID: 7a96cbd2ed80
Revises: cc7410bd0a08
Create Date: 2025-12-16 20:43:39.482862

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a96cbd2ed80'
down_revision: Union[str, None] = 'cc7410bd0a08'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'PENDING_ACTIVATION' to the userstatus enum
    op.execute("ALTER TYPE userstatus ADD VALUE IF NOT EXISTS 'PENDING_ACTIVATION'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum without the value
    pass

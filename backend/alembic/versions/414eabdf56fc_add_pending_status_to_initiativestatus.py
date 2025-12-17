"""add_pending_status_to_initiativestatus

Revision ID: 414eabdf56fc
Revises: fa8897f1132c
Create Date: 2025-12-17 09:32:37.650869

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '414eabdf56fc'
down_revision: Union[str, None] = 'fa8897f1132c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'PENDING' to the initiativestatus enum
    op.execute("ALTER TYPE initiativestatus ADD VALUE IF NOT EXISTS 'PENDING'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum without the value
    pass

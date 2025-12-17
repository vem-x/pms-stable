"""add_scheduled_uppercase_to_reviewcyclestatus

Revision ID: fa8897f1132c
Revises: a493b0d6cda2
Create Date: 2025-12-16 22:21:34.984375

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'fa8897f1132c'
down_revision: Union[str, None] = 'a493b0d6cda2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add SCHEDULED (uppercase) to the reviewcyclestatus enum
    op.execute("ALTER TYPE reviewcyclestatus ADD VALUE IF NOT EXISTS 'SCHEDULED'")


def downgrade() -> None:
    # Note: PostgreSQL does not support removing enum values
    # This would require recreating the enum type
    pass

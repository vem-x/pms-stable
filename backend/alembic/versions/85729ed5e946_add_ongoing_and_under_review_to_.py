"""add_ongoing_and_under_review_to_initiativestatus

Revision ID: 85729ed5e946
Revises: 414eabdf56fc
Create Date: 2025-12-17 09:37:51.404326

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '85729ed5e946'
down_revision: Union[str, None] = '414eabdf56fc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'ONGOING' and 'UNDER_REVIEW' to the initiativestatus enum
    op.execute("ALTER TYPE initiativestatus ADD VALUE IF NOT EXISTS 'ONGOING'")
    op.execute("ALTER TYPE initiativestatus ADD VALUE IF NOT EXISTS 'UNDER_REVIEW'")


def downgrade() -> None:
    # PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum without the value
    pass

"""add_onboarding_token_expiration

Revision ID: b3d53f692103
Revises: 9af49871a6c8
Create Date: 2025-12-03 12:33:29.823064

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b3d53f692103'
down_revision: Union[str, None] = '9af49871a6c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add onboarding_token_expires_at column to users table
    op.add_column('users', sa.Column('onboarding_token_expires_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    # Remove onboarding_token_expires_at column from users table
    op.drop_column('users', 'onboarding_token_expires_at')

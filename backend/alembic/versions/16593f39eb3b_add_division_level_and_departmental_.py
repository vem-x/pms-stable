"""add_division_level_and_departmental_goals

Revision ID: 16593f39eb3b
Revises: 5c516a9f6340
Create Date: 2026-01-12 19:44:51.329607

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '16593f39eb3b'
down_revision: Union[str, None] = '5c516a9f6340'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 'DIVISION' to OrganizationLevel enum (uppercase to match existing values)
    # Note: PostgreSQL adds new enum values at the end, order in Python enum determines usage
    op.execute("ALTER TYPE organizationlevel ADD VALUE IF NOT EXISTS 'DIVISION'")

    # Add 'DEPARTMENTAL' to GoalType enum
    op.execute("ALTER TYPE goaltype ADD VALUE IF NOT EXISTS 'DEPARTMENTAL'")

    # Add organization_id column to goals table for departmental goals
    op.add_column('goals',
        sa.Column('organization_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=True)
    )

    # Add foreign key constraint
    op.create_foreign_key(
        'fk_goals_organization_id',
        'goals', 'organizations',
        ['organization_id'], ['id']
    )


def downgrade() -> None:
    # Remove foreign key constraint
    op.drop_constraint('fk_goals_organization_id', 'goals', type_='foreignkey')

    # Remove organization_id column
    op.drop_column('goals', 'organization_id')

    # Note: PostgreSQL doesn't support removing enum values directly
    # You would need to recreate the enum type to remove values
    # For safety, we'll leave the enum values in place during downgrade

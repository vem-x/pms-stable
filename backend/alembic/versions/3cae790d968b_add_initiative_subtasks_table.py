"""add_initiative_subtasks_table

Revision ID: 3cae790d968b
Revises: 16593f39eb3b
Create Date: 2026-01-12 19:53:10.854829

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3cae790d968b'
down_revision: Union[str, None] = '16593f39eb3b'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create initiative_subtasks table
    op.create_table(
        'initiative_subtasks',
        sa.Column('id', sa.dialects.postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('title', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('sequence_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('initiative_id', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('created_by', sa.dialects.postgresql.UUID(as_uuid=True), nullable=False),
        sa.ForeignKeyConstraint(['initiative_id'], ['initiatives.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id']),
    )

    # Create indexes for better performance
    op.create_index('ix_initiative_subtasks_initiative_id', 'initiative_subtasks', ['initiative_id'])
    op.create_index('ix_initiative_subtasks_status', 'initiative_subtasks', ['status'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_initiative_subtasks_status', table_name='initiative_subtasks')
    op.drop_index('ix_initiative_subtasks_initiative_id', table_name='initiative_subtasks')

    # Drop table
    op.drop_table('initiative_subtasks')

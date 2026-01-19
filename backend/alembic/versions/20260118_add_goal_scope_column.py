"""add goal scope column and separate scope from type

Revision ID: 20260118_scope_type
Revises: 20260118_title_length
Create Date: 2026-01-18 14:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20260118_scope_type'
down_revision = '20260118_title_length'
branch_labels = None
depends_on = None


def upgrade():
    # Step 1: Create new GoalScope enum type
    goalscope_enum = postgresql.ENUM('COMPANY_WIDE', 'DEPARTMENTAL', 'INDIVIDUAL', name='goalscope')
    goalscope_enum.create(op.get_bind())

    # Step 2: Add scope column (nullable initially for data migration)
    op.add_column('goals', sa.Column('scope', sa.Enum('COMPANY_WIDE', 'DEPARTMENTAL', 'INDIVIDUAL', name='goalscope'), nullable=True))

    # Step 3: Migrate existing data based on old type values
    # YEARLY → COMPANY_WIDE scope, YEARLY type
    op.execute("""
        UPDATE goals
        SET scope = 'COMPANY_WIDE'
        WHERE type = 'YEARLY'
    """)

    # QUARTERLY → COMPANY_WIDE scope, QUARTERLY type
    op.execute("""
        UPDATE goals
        SET scope = 'COMPANY_WIDE'
        WHERE type = 'QUARTERLY'
    """)

    # DEPARTMENTAL → DEPARTMENTAL scope, YEARLY type (default)
    # Note: Admins can change to QUARTERLY after migration if needed
    op.execute("""
        UPDATE goals
        SET scope = 'DEPARTMENTAL'
        WHERE type = 'DEPARTMENTAL'
    """)
    op.execute("""
        UPDATE goals
        SET type = 'YEARLY'
        WHERE scope = 'DEPARTMENTAL'
    """)

    # INDIVIDUAL → INDIVIDUAL scope, QUARTERLY type (individuals are always quarterly)
    op.execute("""
        UPDATE goals
        SET scope = 'INDIVIDUAL'
        WHERE type = 'INDIVIDUAL'
    """)
    op.execute("""
        UPDATE goals
        SET type = 'QUARTERLY'
        WHERE scope = 'INDIVIDUAL'
    """)

    # Step 4: Keep scope column nullable for backward compatibility
    # This allows manual updating of existing goals
    # op.alter_column('goals', 'scope', nullable=False)  # Commented out for backward compatibility

    # Step 5: Update GoalType enum to only have YEARLY and QUARTERLY
    # First, drop the old enum constraint
    op.execute("ALTER TABLE goals ALTER COLUMN type TYPE VARCHAR(20)")

    # Drop old enum type
    op.execute("DROP TYPE IF EXISTS goaltype CASCADE")

    # Create new enum type with only YEARLY and QUARTERLY
    goaltype_enum = postgresql.ENUM('YEARLY', 'QUARTERLY', name='goaltype')
    goaltype_enum.create(op.get_bind())

    # Convert column back to use the new enum
    op.execute("ALTER TABLE goals ALTER COLUMN type TYPE goaltype USING type::text::goaltype")


def downgrade():
    # Step 1: Recreate old GoalType enum with all values
    op.execute("ALTER TABLE goals ALTER COLUMN type TYPE VARCHAR(20)")
    op.execute("DROP TYPE IF EXISTS goaltype CASCADE")

    old_goaltype_enum = postgresql.ENUM('YEARLY', 'QUARTERLY', 'DEPARTMENTAL', 'INDIVIDUAL', name='goaltype')
    old_goaltype_enum.create(op.get_bind())

    # Step 2: Migrate data back to old type values based on scope
    # COMPANY_WIDE + YEARLY → YEARLY
    op.execute("""
        UPDATE goals
        SET type = 'YEARLY'
        WHERE scope = 'COMPANY_WIDE' AND type = 'YEARLY'
    """)

    # COMPANY_WIDE + QUARTERLY → QUARTERLY
    op.execute("""
        UPDATE goals
        SET type = 'QUARTERLY'
        WHERE scope = 'COMPANY_WIDE' AND type = 'QUARTERLY'
    """)

    # DEPARTMENTAL + any type → DEPARTMENTAL
    op.execute("""
        UPDATE goals
        SET type = 'DEPARTMENTAL'
        WHERE scope = 'DEPARTMENTAL'
    """)

    # INDIVIDUAL + any type → INDIVIDUAL
    op.execute("""
        UPDATE goals
        SET type = 'INDIVIDUAL'
        WHERE scope = 'INDIVIDUAL'
    """)

    # Step 3: Convert type column back to use old enum
    op.execute("ALTER TABLE goals ALTER COLUMN type TYPE goaltype USING type::text::goaltype")

    # Step 4: Drop scope column
    op.drop_column('goals', 'scope')

    # Step 5: Drop new scope enum type
    op.execute("DROP TYPE IF EXISTS goalscope CASCADE")

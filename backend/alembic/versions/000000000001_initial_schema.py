"""initial schema - create all tables

Revision ID: 000000000001
Revises:
Create Date: 2025-11-01 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '000000000001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    from database import Base
    import models  # noqa: F401 - Import to register all models with Base

    bind = op.get_bind()
    Base.metadata.create_all(bind=bind, checkfirst=True)


def downgrade() -> None:
    from database import Base
    import models  # noqa: F401

    bind = op.get_bind()
    Base.metadata.drop_all(bind=bind)

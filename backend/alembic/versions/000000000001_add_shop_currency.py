"""add shop currency

Revision ID: 000000000001
Revises: 000000000000
Create Date: 2026-02-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '000000000001'
down_revision: Union[str, None] = '000000000000'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)

    # Check if column already exists
    columns = [c['name'] for c in inspector.get_columns('shop')]
    if 'currency' not in columns:
        op.add_column('shop', sa.Column('currency', sa.String(), nullable=False, server_default='EUR'))


def downgrade() -> None:
    op.drop_column('shop', 'currency')

"""add exchange rates

Revision ID: 000000000002
Revises: 000000000001
Create Date: 2026-02-14

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect


# revision identifiers, used by Alembic.
revision: str = '000000000002'
down_revision: Union[str, None] = '000000000001'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c['name'] for c in inspector.get_columns('appconfig')]

    if 'usd_rate' not in columns:
        op.add_column('appconfig', sa.Column('usd_rate', sa.Float(), nullable=False, server_default='0'))
    if 'rub_rate' not in columns:
        op.add_column('appconfig', sa.Column('rub_rate', sa.Float(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('appconfig', 'rub_rate')
    op.drop_column('appconfig', 'usd_rate')

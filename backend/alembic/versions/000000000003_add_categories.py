"""add categories

Revision ID: 000000000003
Revises: 000000000002
Create Date: 2026-02-23 20:26:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '000000000003'
down_revision: Union[str, None] = '000000000002'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    if 'category' not in existing_tables:
        op.create_table('category',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('color_class', sqlmodel.sql.sqltypes.AutoString(), nullable=True),
        sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_category_name'), 'category', ['name'], unique=True)
        
        # Insert default values
        op.execute(
            """INSERT INTO category (name, color_class) VALUES 
            ('Без категории', 'bg-light text-dark border'),
            ('продукты', 'bg-primary'),
            ('хоз.товары', 'bg-info text-dark'),
            ('растения', 'bg-success'),
            ('для дома', 'bg-warning text-dark'),
            ('для машины', 'bg-secondary'),
            ('топливо', 'bg-danger text-light')"""
        )

def downgrade() -> None:
    op.drop_index(op.f('ix_category_name'), table_name='category')
    op.drop_table('category')

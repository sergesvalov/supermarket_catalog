"""initial migration

Revision ID: 000000000000
Revises: 
Create Date: 2024-01-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel


# revision identifiers, used by Alembic.
revision: str = '000000000000'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Shop ---
    op.create_table('shop',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_shop_name'), 'shop', ['name'], unique=True)

    # --- Product ---
    op.create_table('product',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('category', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('weight', sa.Float(), nullable=True),
        sa.Column('weight_per_piece', sa.Float(), nullable=True),
        sa.Column('calories', sa.Float(), nullable=True),
        sa.Column('proteins', sa.Float(), nullable=True),
        sa.Column('fats', sa.Float(), nullable=True),
        sa.Column('carbs', sa.Float(), nullable=True),
        sa.Column('quantity', sa.Integer(), nullable=True),
        sa.Column('shop_id', sa.Integer(), nullable=True),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['shop_id'], ['shop.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_product_category'), 'product', ['category'], unique=False)
    op.create_index(op.f('ix_product_name'), 'product', ['name'], unique=False)
    op.create_index(op.f('ix_product_price'), 'product', ['price'], unique=False)

    # --- PriceHistory ---
    op.create_table('pricehistory',
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('price', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['product.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # --- ShoppingList ---
    op.create_table('shoppinglist',
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # --- ShoppingListItem ---
    op.create_table('shoppinglistitem',
        sa.Column('shopping_list_id', sa.Integer(), nullable=False),
        sa.Column('product_id', sa.Integer(), nullable=False),
        sa.Column('quantity', sa.Integer(), nullable=False),
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('is_bought', sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(['product_id'], ['product.id'], ),
        sa.ForeignKeyConstraint(['shopping_list_id'], ['shoppinglist.id'], ),
        sa.PrimaryKeyConstraint('id')
    )

    # --- Telegram ---
    op.create_table('telegramconfig',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('bot_token', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    op.create_table('telegramuser',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.Column('chat_id', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )

    # --- AppConfig ---
    op.create_table('appconfig',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('currency', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('appconfig')
    op.drop_table('telegramuser')
    op.drop_table('telegramconfig')
    op.drop_table('shoppinglistitem')
    op.drop_table('shoppinglist')
    op.drop_table('pricehistory')
    op.drop_index(op.f('ix_product_price'), table_name='product')
    op.drop_index(op.f('ix_product_name'), table_name='product')
    op.drop_index(op.f('ix_product_category'), table_name='product')
    op.drop_table('product')
    op.drop_index(op.f('ix_shop_name'), table_name='shop')
    op.drop_table('shop')

import asyncio
from logging.config import fileConfig

from sqlalchemy import engine_from_config, pool
from sqlalchemy import create_engine

from alembic import context
from sqlmodel import SQLModel

# Import your models here so Alembic can see them
from models import *  # noqa
from config import settings

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Force synchronous URL for migrations
sync_url = settings.DATABASE_URL.replace("+aiosqlite", "")
config.set_main_option("sqlalchemy.url", sync_url)

target_metadata = SQLModel.metadata

def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using synchronous engine."""
    
    # Create synchronous engine
    connectable = create_engine(
        config.get_main_option("sqlalchemy.url"),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(
            connection=connection, 
            target_metadata=target_metadata
        )

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

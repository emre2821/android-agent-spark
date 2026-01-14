from __future__ import annotations

import logging
from pathlib import Path

from sqlalchemy import inspect

from app.config import get_settings
from app.db.base import Base
from app.db.session import get_engine

logger = logging.getLogger(__name__)


def run_migrations() -> None:
    """Create database tables if they do not already exist."""

    engine = get_engine()
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    if existing_tables:
        logger.debug("Database already has tables: %s", existing_tables)

    Base.metadata.create_all(bind=engine)
    settings = get_settings()
    db_path = Path(settings.db_path)
    logger.info("Initialized database at %s", db_path)


__all__ = ["run_migrations"]

from __future__ import annotations

import logging
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator
from urllib.parse import urlparse

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)

_engine = None
_SessionLocal: sessionmaker[Session] | None = None


def _ensure_engine():
    global _engine, _SessionLocal
    if _engine is None:
        settings = get_settings()
        db_path = Path(settings.db_path)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        # Note: SQLite doesn't use connection pooling, but we configure it
        # for potential future migration to a client-server database
        engine_kwargs = {
            "connect_args": {"check_same_thread": False},
            "future": True,
        }
        # Only add pooling config if not using SQLite (check scheme robustly)
        # Handle variations like 'sqlite', 'sqlite3', 'sqlite:///', etc.
        db_scheme = urlparse(settings.database_url).scheme.lower()
        if not db_scheme.startswith("sqlite"):
            engine_kwargs.update({
                "pool_size": 10,
                "max_overflow": 20,
                "pool_pre_ping": True,
                "pool_recycle": 3600,
            })
        _engine = create_engine(settings.database_url, **engine_kwargs)
        _SessionLocal = sessionmaker(bind=_engine, autoflush=False, autocommit=False, future=True)
        logger.debug("Database engine initialised at %s", db_path)


def get_engine():
    _ensure_engine()
    assert _engine is not None
    return _engine


def get_sessionmaker() -> sessionmaker[Session]:
    _ensure_engine()
    assert _SessionLocal is not None
    return _SessionLocal


@contextmanager
def session_scope() -> Iterator[Session]:
    SessionLocal = get_sessionmaker()
    session = SessionLocal()
    try:
        yield session
        session.commit()
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


def reset_engine() -> None:
    global _engine, _SessionLocal
    if _engine is not None:
        _engine.dispose()
    _engine = None
    _SessionLocal = None


__all__ = ["get_engine", "get_sessionmaker", "session_scope", "reset_engine"]

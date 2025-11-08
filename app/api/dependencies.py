from __future__ import annotations

from collections.abc import Generator

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy.orm import Session

from app.config import Settings, get_settings
from app.db.session import get_sessionmaker


def get_db() -> Generator[Session, None, None]:
    SessionLocal = get_sessionmaker()
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def get_current_settings() -> Settings:
    return get_settings()


def require_api_key(settings: Settings = Depends(get_current_settings), x_api_key: str | None = Header(default=None)) -> None:
    if settings.dev_mode:
        return
    if not settings.api_key or x_api_key != settings.api_key:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid API key")


__all__ = ["get_db", "get_current_settings", "require_api_key"]

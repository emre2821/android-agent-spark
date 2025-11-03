from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import agents, generate, posts, rituals, vault
from app.config import Settings, get_settings
from app.db.legacy import migrate_legacy_vault
from app.db.migrate import run_migrations
from app.db.session import session_scope
from app.engine.scheduler import get_scheduler, shutdown_scheduler

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    run_migrations()
    with session_scope() as session:
        migrated = migrate_legacy_vault(session)
        if migrated:
            logger.info("Legacy vault migrated on startup")
    get_scheduler()
    try:
        yield
    finally:
        shutdown_scheduler()


def create_app(settings: Settings | None = None) -> FastAPI:
    if settings is None:
        settings = get_settings()

    app = FastAPI(title="Agent Spark", version="1.0.0", lifespan=lifespan)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(agents.router)
    app.include_router(rituals.router)
    app.include_router(generate.router)
    app.include_router(posts.router)
    app.include_router(vault.router)

    @app.get("/health")
    def healthcheck() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()


__all__ = ["app", "create_app"]

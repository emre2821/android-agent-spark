from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.schedulers.base import SchedulerNotRunningError

from app.config import get_settings
from app.db.session import session_scope
from app.engine.generator import render_threadlight
from app.models.vault import VaultRecord

logger = logging.getLogger(__name__)

_scheduler: BackgroundScheduler | None = None


def _scheduled_generate() -> None:
    with session_scope() as session:
        payload = render_threadlight("scheduled")
        record = VaultRecord(theme=payload["theme"], posts=[payload])
        session.add(record)
        logger.info("Scheduled generator stored record %s", record.id)


def get_scheduler() -> BackgroundScheduler:
    global _scheduler
    if _scheduler is None:
        settings = get_settings()
        _scheduler = BackgroundScheduler(timezone="UTC")
        _scheduler.add_job(_scheduled_generate, "interval", minutes=15, id="threadlight")
        if settings.scheduler_enabled:
            _scheduler.start()
            logger.info("Background scheduler started")
    return _scheduler


def shutdown_scheduler() -> None:
    global _scheduler
    if _scheduler:
        try:
            _scheduler.shutdown(wait=False)
        except SchedulerNotRunningError:
            pass
        _scheduler = None
        logger.info("Background scheduler stopped")


__all__ = ["get_scheduler", "shutdown_scheduler"]

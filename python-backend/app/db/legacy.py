from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import portalocker
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models.vault import VaultRecord

logger = logging.getLogger(__name__)


def _load_legacy_records(path: Path) -> Iterable[dict]:
    with path.open("r", encoding="utf-8") as handle:
        data = json.load(handle)

    if isinstance(data, dict):
        records = data.get("records") or data.get("vault")
        if isinstance(records, list):
            data = records
        else:
            data = [data]

    if not isinstance(data, list):
        raise ValueError("Legacy vault format must be a list or object")

    for item in data:
        if not isinstance(item, dict):
            continue
        yield item


def migrate_legacy_vault(session: Session) -> bool:
    settings = get_settings()
    path = settings.legacy_vault_path
    if not path.exists():
        return False

    path.parent.mkdir(parents=True, exist_ok=True)
    migrated_at = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    lock_path = path.with_suffix(path.suffix + ".lock")
    lock_path.parent.mkdir(parents=True, exist_ok=True)

    try:
        with portalocker.Lock(lock_path, timeout=1):
            try:
                records = list(_load_legacy_records(path))
            except json.JSONDecodeError:
                corrupt_dir = settings.data_dir / "corrupt"
                corrupt_dir.mkdir(parents=True, exist_ok=True)
                new_path = corrupt_dir / f"{path.name}.{migrated_at}"
                path.replace(new_path)
                logger.warning("Legacy vault corrupted; moved to %s", new_path)
                return False
            except Exception as exc:  # noqa: BLE001
                logger.exception("Failed to parse legacy vault: %s", exc)
                raise

            for record in records:
                posts = record.get("posts") or record.get("entries") or []
                theme = record.get("theme") or record.get("title") or "untitled"
                vault_record = VaultRecord(theme=theme, posts=posts)
                session.add(vault_record)

            session.commit()

            migrated_path = path.with_name(f"{path.name}.migrated.{migrated_at}")
            path.replace(migrated_path)
            logger.info("Migrated %s legacy records into SQLite", len(records))
            return True
    except portalocker.exceptions.LockException:
        logger.warning("Could not acquire lock to migrate legacy vault at %s", path)
        return False


__all__ = ["migrate_legacy_vault"]

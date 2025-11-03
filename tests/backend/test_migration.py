from __future__ import annotations

import json
import os
from pathlib import Path

import pytest
from sqlalchemy import select

from app.config import get_settings
from app.db.legacy import migrate_legacy_vault
from app.db.migrate import run_migrations
from app.db.session import get_sessionmaker, reset_engine
from app.models.vault import VaultRecord


@pytest.fixture()
def setup_db(tmp_path: Path):
    get_settings.cache_clear()
    reset_engine()
    os.environ["AGENT_SPARK_DB_PATH"] = str(tmp_path / "db.sqlite")
    os.environ["AGENT_SPARK_LEGACY_VAULT_PATH"] = str(tmp_path / "vault.json")
    os.environ["AGENT_SPARK_DEV_MODE"] = "true"
    os.environ["AGENT_SPARK_SCHEDULER_ENABLED"] = "false"
    os.environ["AGENT_SPARK_DATA_DIR"] = str(tmp_path)
    run_migrations()
    yield tmp_path


def test_migrates_legacy_file(setup_db: Path):
    legacy_path = Path(os.environ["AGENT_SPARK_LEGACY_VAULT_PATH"])
    legacy_path.write_text(json.dumps([
        {"theme": "aurora", "posts": [{"body": "light"}]}
    ]), encoding="utf-8")

    SessionLocal = get_sessionmaker()
    with SessionLocal() as session:
        migrated = migrate_legacy_vault(session)
        assert migrated is True
        records = session.scalars(select(VaultRecord)).all()
        assert len(records) == 1
        assert records[0].theme == "aurora"


def test_corrupt_file_moved(setup_db: Path):
    legacy_path = Path(os.environ["AGENT_SPARK_LEGACY_VAULT_PATH"])
    legacy_path.write_text("not json", encoding="utf-8")

    SessionLocal = get_sessionmaker()
    with SessionLocal() as session:
        migrated = migrate_legacy_vault(session)
        assert migrated is False

    corrupt_dir = Path(os.environ["AGENT_SPARK_DB_PATH"]).parent / "corrupt"
    assert corrupt_dir.exists()
    assert any(child.name.startswith(legacy_path.name) for child in corrupt_dir.iterdir())

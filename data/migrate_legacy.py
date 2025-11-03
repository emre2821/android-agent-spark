"""Standalone helper to migrate a legacy vault.json into SQLite."""

from __future__ import annotations

from app.db.legacy import migrate_legacy_vault
from app.db.migrate import run_migrations
from app.db.session import session_scope


def main() -> None:
    run_migrations()
    with session_scope() as session:
        migrated = migrate_legacy_vault(session)
        if migrated:
            print("Legacy vault migrated")
        else:
            print("No legacy vault found or migration skipped")


if __name__ == "__main__":
    main()

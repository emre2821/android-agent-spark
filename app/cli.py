from __future__ import annotations

import argparse
import logging
import subprocess
import sys
from pathlib import Path

import uvicorn
from app.db.legacy import migrate_legacy_vault
from app.db.migrate import run_migrations
from app.db.session import session_scope

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def cmd_runserver(args: argparse.Namespace) -> None:
    host = args.host or "127.0.0.1"
    port = args.port or 8000
    logger.info("Starting Agent Spark backend on %s:%s", host, port)
    uvicorn.run("app.main:app", host=host, port=port, reload=args.reload)


def cmd_import_legacy(_: argparse.Namespace) -> None:
    run_migrations()
    with session_scope() as session:
        migrated = migrate_legacy_vault(session)
        if migrated:
            logger.info("Legacy vault migration complete")
        else:
            logger.info("No legacy vault found or migration skipped")


def cmd_build_apk_helper(_: argparse.Namespace) -> None:
    wrapper_dir = Path(__file__).resolve().parent.parent / "android-wrapper"
    script = Path(__file__).resolve().parent.parent / "scripts" / "build_apk_debug.sh"
    logger.info("Android wrapper located at %s", wrapper_dir)
    logger.info("Running build script %s", script)
    try:
        subprocess.run(["bash", str(script)], check=True)
    except subprocess.CalledProcessError as exc:
        logger.error("APK build failed: %s", exc)
        sys.exit(exc.returncode)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="agent-spark")
    sub = parser.add_subparsers(dest="command", required=True)

    runserver = sub.add_parser("runserver", help="Start the FastAPI server")
    runserver.add_argument("--host", default="127.0.0.1")
    runserver.add_argument("--port", type=int, default=8000)
    runserver.add_argument("--reload", action="store_true")
    runserver.set_defaults(func=cmd_runserver)

    import_legacy = sub.add_parser("import-legacy", help="Import legacy vault data")
    import_legacy.set_defaults(func=cmd_import_legacy)

    build_apk = sub.add_parser("build-apk-helper", help="Invoke the Android WebView wrapper build")
    build_apk.set_defaults(func=cmd_build_apk_helper)

    return parser


def main(argv: list[str] | None = None) -> None:
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()

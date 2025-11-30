#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR=$(cd "$(dirname "$0")" && pwd)
PROJECT_DIR=$(cd "$SCRIPT_DIR/../.." && pwd)
PYTHON_DIR="$PROJECT_DIR/scripts/python"
VENV_DIR="$PYTHON_DIR/.venv-termux"

pkg install -y python git || true

if [[ ! -d "$VENV_DIR" ]]; then
  python -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"
python -m pip install --upgrade pip
pip install -r "$PYTHON_DIR/requirements.txt"

export AGENT_SPARK_DB_PATH="$PROJECT_DIR/data/agent_spark.db"
export AGENT_SPARK_DEV_MODE=true

cd "$PYTHON_DIR"
python -m app.cli runserver --host 127.0.0.1 --port 8000

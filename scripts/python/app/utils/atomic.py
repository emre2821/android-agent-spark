from __future__ import annotations

import json
import os
import tempfile
from pathlib import Path
from typing import Any


def atomic_write(path: Path, content: str | bytes, mode: str = "w", encoding: str = "utf-8") -> None:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    if "b" in mode:
        data: bytes = content if isinstance(content, bytes) else str(content).encode(encoding)
    else:
        data = content if isinstance(content, str) else json.dumps(content)

    with tempfile.NamedTemporaryFile(delete=False, dir=path.parent) as tmp:
        if isinstance(data, bytes):
            tmp.write(data)
        else:
            tmp.write(data.encode(encoding))
        tmp.flush()
        os.fsync(tmp.fileno())
        tmp_path = Path(tmp.name)
    os.replace(tmp_path, path)


__all__ = ["atomic_write"]

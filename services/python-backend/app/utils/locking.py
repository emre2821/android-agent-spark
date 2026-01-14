from __future__ import annotations

from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import portalocker


@contextmanager
def exclusive_lock(path: Path, timeout: float = 5.0) -> Iterator[None]:
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with portalocker.Lock(path, timeout=timeout):
        yield


__all__ = ["exclusive_lock"]

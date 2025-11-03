from __future__ import annotations

import random
from datetime import datetime, timezone
from typing import Any


def render_threadlight(theme: str, prompt: str | None = None) -> dict[str, Any]:
    seed = random.randint(1000, 9999)
    timestamp = datetime.now(timezone.utc).isoformat()
    body = prompt or f"Threadlight spark for {theme} #{seed}"
    return {
        "theme": theme,
        "prompt": prompt,
        "body": body,
        "created_at": timestamp,
    }


__all__ = ["render_threadlight"]

from __future__ import annotations

import asyncio
import os
from pathlib import Path

import pytest
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.db.session import reset_engine
from app.main import create_app, lifespan as app_lifespan


@pytest.mark.asyncio()
async def test_concurrent_quickpost(tmp_path: Path):
    get_settings.cache_clear()
    reset_engine()
    os.environ["AGENT_SPARK_DB_PATH"] = str(tmp_path / "db.sqlite")
    os.environ["AGENT_SPARK_DEV_MODE"] = "true"
    os.environ["AGENT_SPARK_SCHEDULER_ENABLED"] = "false"
    os.environ["AGENT_SPARK_DATA_DIR"] = str(tmp_path)
    app = create_app()

    async with app_lifespan(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            async def post_item(idx: int):
                payload = {"theme": "thread", "content": {"index": idx}}
                response = await client.post("/quickpost", json=payload)
                assert response.status_code == 201

            await asyncio.gather(*[post_item(i) for i in range(10)])

            posts_resp = await client.get("/posts")
            assert posts_resp.status_code == 200
            posts = posts_resp.json()
            assert len(posts) == 10
            indices = sorted(item["content"]["index"] for item in posts)
            assert indices == list(range(10))

from __future__ import annotations

import os
from pathlib import Path

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient

from app.config import get_settings
from app.db.session import reset_engine
from app.main import create_app, lifespan as app_lifespan


@pytest_asyncio.fixture()
async def test_client(tmp_path: Path):
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
            yield client


@pytest_asyncio.fixture()
async def test_client_with_auth(tmp_path: Path):
    get_settings.cache_clear()
    reset_engine()
    os.environ["AGENT_SPARK_DB_PATH"] = str(tmp_path / "db.sqlite")
    os.environ["AGENT_SPARK_DEV_MODE"] = "false"
    os.environ["AGENT_SPARK_API_KEY"] = "secret"
    os.environ["AGENT_SPARK_API_KEY"] = "test-secret"
    os.environ["AGENT_SPARK_SCHEDULER_ENABLED"] = "false"
    os.environ["AGENT_SPARK_DATA_DIR"] = str(tmp_path)
    app = create_app()
    async with app_lifespan(app):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            yield client
    os.environ.pop("AGENT_SPARK_API_KEY", None)
    os.environ.pop("AGENT_SPARK_DEV_MODE", None)


@pytest.mark.asyncio()
async def test_agent_crud(test_client: AsyncClient):
    response = await test_client.post("/agents", json={"name": "Echo", "traits": {"mood": "calm"}})
    assert response.status_code == 201
    agent = response.json()
    assert agent["name"] == "Echo"

    list_response = await test_client.get("/agents")
    assert list_response.status_code == 200
    items = list_response.json()
    assert len(items) == 1
    assert items[0]["id"] == agent["id"]


@pytest.mark.asyncio()
async def test_generate_and_vault_export(test_client: AsyncClient):
    response = await test_client.post("/generate", json={"theme": "dawn"})
    assert response.status_code == 201
    record = response.json()
    assert record["theme"] == "dawn"

    vault_resp = await test_client.get("/vault")
    assert vault_resp.status_code == 200
    assert len(vault_resp.json()) == 1

    export_resp = await test_client.get("/vault/export")
    assert export_resp.status_code == 200
    exported = export_resp.json()
    assert len(exported["records"]) == 1


@pytest.mark.asyncio()
async def test_ritual_logging(test_client: AsyncClient):
    response = await test_client.post(
        "/rituals",
        json={"event_type": "meditation", "emotion": "serene", "context": "sunrise"},
    )
    assert response.status_code == 201
    ritual = response.json()
    assert ritual["event_type"] == "meditation"

    list_resp = await test_client.get("/rituals")
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1


@pytest.mark.asyncio()
async def test_api_key_required_when_dev_mode_disabled(test_client_with_auth: AsyncClient):
    payload = {"name": "Echo", "traits": {"mood": "calm"}}

    missing_key_response = await test_client_with_auth.post("/agents", json=payload)
    assert missing_key_response.status_code == 401

    wrong_key_response = await test_client_with_auth.post(
        "/agents", json=payload, headers={"X-API-Key": "wrong"}
    )
    assert wrong_key_response.status_code == 401

    empty_key_response = await test_client_with_auth.post(
        "/agents", json=payload, headers={"X-API-Key": ""}
    )
    assert empty_key_response.status_code == 401

    casing_mismatch_response = await test_client_with_auth.post(
        "/agents", json=payload, headers={"X-API-Key": "SECRET"}
    )
    assert casing_mismatch_response.status_code == 401

    multiple_values_response = await test_client_with_auth.post(
        "/agents", json=payload, headers=[("X-API-Key", "wrong"), ("X-API-Key", "secret")]
    )
    assert multiple_values_response.status_code == 401

    valid_key_response = await test_client_with_auth.post(
        "/agents", json=payload, headers={"X-API-Key": "secret"}
    )
    assert valid_key_response.status_code == 201
    missing_key_response = await test_client_with_auth.post(
        "/agents", json={"name": "Echo", "traits": {"mood": "calm"}}
    )
    assert missing_key_response.status_code == 401

    wrong_key_response = await test_client_with_auth.post(
        "/agents",
        json={"name": "Echo", "traits": {"mood": "calm"}},
        headers={"X-API-Key": "wrong"},
    )
    assert wrong_key_response.status_code == 401

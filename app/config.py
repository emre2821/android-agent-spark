from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import BaseSettings, Field


class Settings(BaseSettings):
    """Application configuration loaded from environment variables."""

    db_path: Path = Field(default=Path("data") / "agent_spark.db", env="AGENT_SPARK_DB_PATH")
    api_key: Optional[str] = Field(default=None, env="AGENT_SPARK_API_KEY")
    legacy_vault_path: Path = Field(default=Path("data") / "vault.json", env="AGENT_SPARK_LEGACY_VAULT_PATH")
    data_dir: Path = Field(default=Path("data"), env="AGENT_SPARK_DATA_DIR")
    dev_mode: bool = Field(default=True, env="AGENT_SPARK_DEV_MODE")
    scheduler_enabled: bool = Field(default=True, env="AGENT_SPARK_SCHEDULER_ENABLED")

    class Config:
        env_prefix = "AGENT_SPARK_"
        case_sensitive = False

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.db_path}"


@lru_cache()
def get_settings() -> Settings:
    settings = Settings()
    settings.data_dir.mkdir(parents=True, exist_ok=True)
    return settings


__all__ = ["Settings", "get_settings"]

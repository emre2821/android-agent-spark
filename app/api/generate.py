from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_api_key
from app.engine.generator import render_threadlight
from app.models.vault import VaultRecord

router = APIRouter(prefix="/generate", tags=["generate"])


class GeneratePayload(BaseModel):
    theme: str = Field(..., min_length=1)
    prompt: Optional[str] = None


class GenerateResponse(BaseModel):
    id: str
    theme: str
    posts: list[dict[str, Any]]
    created_at: datetime

    @classmethod
    def from_record(cls, record: VaultRecord) -> "GenerateResponse":
        return cls(id=record.id, theme=record.theme, posts=record.posts or [], created_at=record.created_at)


@router.post("", response_model=GenerateResponse, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_key)])
def generate(payload: GeneratePayload, db: Session = Depends(get_db)) -> GenerateResponse:
    post = render_threadlight(payload.theme, prompt=payload.prompt)
    record = VaultRecord(theme=payload.theme, posts=[post])
    db.add(record)
    db.commit()
    db.refresh(record)
    return GenerateResponse.from_record(record)


__all__ = ["router"]

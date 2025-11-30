from __future__ import annotations

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_api_key
from app.models.ritual import RitualLog

router = APIRouter(prefix="/rituals", tags=["rituals"])


class RitualPayload(BaseModel):
    agent_id: Optional[str] = None
    event_type: str = Field(..., min_length=1)
    emotion: Optional[str] = None
    context: Optional[str] = None
    text: Optional[str] = None


class RitualRead(BaseModel):
    id: str
    agent_id: Optional[str]
    event_type: str
    emotion: Optional[str]
    context: Optional[str]
    text: Optional[str]
    created_at: datetime

    @classmethod
    def from_orm(cls, record: RitualLog) -> "RitualRead":
        return cls(
            id=record.id,
            agent_id=record.agent_id,
            event_type=record.event_type,
            emotion=record.emotion,
            context=record.context,
            text=record.text,
            created_at=record.created_at,
        )


@router.get("", response_model=list[RitualRead])
def list_rituals(db: Session = Depends(get_db)) -> list[RitualRead]:
    records = db.scalars(select(RitualLog).order_by(RitualLog.created_at.desc())).all()
    return [RitualRead.from_orm(record) for record in records]


@router.post("", response_model=RitualRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_key)])
def create_ritual(payload: RitualPayload, db: Session = Depends(get_db)) -> RitualRead:
    record = RitualLog(
        agent_id=payload.agent_id,
        event_type=payload.event_type,
        emotion=payload.emotion,
        context=payload.context,
        text=payload.text,
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return RitualRead.from_orm(record)


__all__ = ["router"]

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db
from app.models.vault import VaultRecord

router = APIRouter(prefix="/vault", tags=["vault"])


def _record_to_dict(record: VaultRecord) -> dict[str, Any]:
    return {
        "id": record.id,
        "theme": record.theme,
        "posts": record.posts or [],
        "created_at": record.created_at.isoformat(),
    }


@router.get("", response_model=list[dict[str, Any]])
def list_vault(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    records = db.scalars(select(VaultRecord).order_by(VaultRecord.created_at.desc())).all()
    return [_record_to_dict(record) for record in records]


@router.get("/export")
def export_vault(db: Session = Depends(get_db)) -> JSONResponse:
    records = list_vault(db)
    return JSONResponse(content={"records": records})


__all__ = ["router"]

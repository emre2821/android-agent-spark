from __future__ import annotations

from datetime import datetime
from typing import Any, Optional
from uuid import uuid4

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_api_key
from app.models.post import Post

router = APIRouter(tags=["posts"])


class QuickPostPayload(BaseModel):
    theme: str = Field(..., min_length=1)
    content: dict[str, Any] = Field(default_factory=dict)
    agent_id: Optional[str] = None


class PostRead(BaseModel):
    id: str
    theme: str
    content: dict[str, Any]
    agent_id: Optional[str]
    created_at: datetime

    @classmethod
    def from_orm(cls, post: Post) -> "PostRead":
        return cls(
            id=post.id,
            theme=post.theme,
            content=post.content or {},
            agent_id=post.agent_id,
            created_at=post.created_at,
        )


@router.get("/posts", response_model=list[PostRead])
def list_posts(db: Session = Depends(get_db)) -> list[PostRead]:
    posts = db.scalars(select(Post).order_by(Post.created_at.desc())).all()
    return [PostRead.from_orm(post) for post in posts]


@router.post("/quickpost", response_model=PostRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_key)])
def quickpost(payload: QuickPostPayload, db: Session = Depends(get_db)) -> PostRead:
    post = Post(id=str(uuid4()), theme=payload.theme, content=payload.content, agent_id=payload.agent_id)
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostRead.from_orm(post)


__all__ = ["router", "PostRead"]

from __future__ import annotations

from datetime import datetime
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_db, require_api_key
from app.models.agent import Agent

router = APIRouter(prefix="/agents", tags=["agents"])


class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1)
    traits: dict[str, Any] = Field(default_factory=dict)


class AgentRead(BaseModel):
    id: str
    name: str
    traits: dict[str, Any]
    created_at: datetime

    @classmethod
    def from_orm(cls, agent: Agent) -> "AgentRead":
        return cls(id=agent.id, name=agent.name, traits=agent.traits or {}, created_at=agent.created_at)


@router.get("", response_model=list[AgentRead])
def list_agents(db: Session = Depends(get_db)) -> list[AgentRead]:
    agents = db.scalars(select(Agent).order_by(Agent.created_at.desc())).all()
    return [AgentRead.from_orm(agent) for agent in agents]


@router.post("", response_model=AgentRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_api_key)])
def create_agent(payload: AgentCreate, db: Session = Depends(get_db)) -> AgentRead:
    agent = Agent(id=str(uuid4()), name=payload.name, traits=payload.traits)
    db.add(agent)
    db.commit()
    db.refresh(agent)
    return AgentRead.from_orm(agent)


__all__ = ["router"]

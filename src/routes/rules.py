import uuid
from datetime import datetime

from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["rules"])


class RuleRead(BaseModel):
    id: uuid.UUID
    policy_id: uuid.UUID
    phrase: str
    category: str
    is_regex: bool
    action: str
    severity: str
    description: str
    created_at: datetime
    updated_at: datetime


_STUB_RULE = RuleRead(
    id=uuid.uuid4(),
    policy_id=uuid.uuid4(),
    phrase="ignore all previous instructions",
    category="prompt_injection",
    is_regex=False,
    action="block",
    severity="high",
    description="Basic block",
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow(),
)


@router.get("/v1/rules", response_model=dict)
async def list_rules_for_policy(
    policy_id: uuid.UUID | None = None, skip: int = 0, limit: int = 100
):
    return {"items": [_STUB_RULE], "total": 1, "page": 1, "size": limit, "pages": 1}


@router.post("/v1/rules", response_model=RuleRead)
async def create_rule(rule: dict):
    return _STUB_RULE

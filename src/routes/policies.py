import uuid
from datetime import datetime
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(tags=["policies"])


class PolicyRead(BaseModel):
    id: uuid.UUID
    name: str
    description: str = ""
    config: dict = {}
    is_active: bool = True
    version: int
    created_at: datetime
    updated_at: datetime


_STUB_POLICY = PolicyRead(
    id=uuid.uuid4(),
    name="Default Policy",
    description="Default zero-trust policy",
    config={},
    is_active=True,
    version=1,
    created_at=datetime.utcnow(),
    updated_at=datetime.utcnow(),
)


@router.get("/v1/policies", response_model=list[PolicyRead])
async def list_policies(active_only: bool = False):
    return [_STUB_POLICY]


@router.get("/v1/policies/{policy_id}", response_model=PolicyRead)
async def get_policy(policy_id: uuid.UUID):
    return _STUB_POLICY


@router.post("/v1/policies", response_model=PolicyRead)
async def create_policy(policy: dict):
    return _STUB_POLICY


@router.put("/v1/policies/{policy_id}", response_model=PolicyRead)
async def update_policy(policy_id: uuid.UUID, policy: dict):
    return _STUB_POLICY

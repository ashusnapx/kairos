from fastapi import APIRouter
from src.services.policy import get_active_policies, get_policy_by_version

router = APIRouter(prefix="/api/policies", tags=["policies"])


@router.get("")
async def list_policies():
    return get_active_policies()


@router.get("/{version}")
async def get_policy(version: str):
    policy = get_policy_by_version(version)
    if not policy:
        return {"error": f"Policy version {version} not found"}, 404
    return policy

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from src.services.redteam import red_team, ATTACK_SCENARIOS

router = APIRouter(prefix="/api/redteam", tags=["redteam"])


class TriggerAttack(BaseModel):
    scenario_name: str


@router.get("/scenarios")
async def list_scenarios():
    return ATTACK_SCENARIOS


@router.get("/summary")
async def get_summary():
    # Execute a subset of scenarios to generate a dynamic live report
    report = red_team.run_scenario()
    results = report.get("results", [])

    total = len(results)
    detected = sum(1 for r in results if r["detection_outcome"] == "DETECTED")
    evaded = total - detected

    return {
        "total_attacks_tested": total,
        "detected_count": detected,
        "evaded_count": evaded,
        "detection_rate": round(detected / total, 2) if total > 0 else 1.0,
        "overall_assessment": report.get("overall_assessment", "RESILIENT"),
        "results": results,
    }


@router.post("/trigger")
async def trigger_attack(body: TriggerAttack):
    valid_names = [s["name"] for s in ATTACK_SCENARIOS]
    if body.scenario_name not in valid_names:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario name. Choose from: {', '.join(valid_names)}"
        )

    result = red_team.run_scenario(body.scenario_name)
    return result.get("results", [{}])[0]

from fastapi import APIRouter

router = APIRouter(prefix="/api/judge", tags=["judge"])

COMPARISON_MATRIX = {
    "capabilities": [
        {"capability": "OCR / Data Extraction", "traditional": True, "kairos": True},
        {"capability": "Document Tampering Detection", "traditional": False, "kairos": True},
        {"capability": "Explainable Risk Scoring", "traditional": False, "kairos": True},
        {"capability": "Multi-Agent Debate", "traditional": False, "kairos": True},
        {"capability": "Counterfactual Explanations", "traditional": False, "kairos": True},
        {"capability": "Graph Intelligence", "traditional": False, "kairos": True},
        {"capability": "Regulatory Reasoning", "traditional": False, "kairos": True},
        {"capability": "Human-in-the-Loop Learning", "traditional": False, "kairos": True},
        {"capability": "Adversarial Testing", "traditional": False, "kairos": True},
        {"capability": "AMD ROCm Optimization", "traditional": False, "kairos": True},
        {"capability": "Audit Trails", "traditional": "Basic logs", "kairos": "Full traceability"},
        {"capability": "Policy-as-Code", "traditional": False, "kairos": True},
    ]
}


@router.get("/comparison")
async def get_comparison():
    return COMPARISON_MATRIX

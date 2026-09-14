import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from ai_service import analyze_project
from auth import get_optional_user
from models import EstimateInput


router = APIRouter(prefix="/api", tags=["estimates"])


SCOPE_ITEMS = [
    ("frontend", "Frontend Development", 0.50),
    ("backend", "Backend Development", 0.30),
    ("database", "Database Architecture", 0.15),
    ("api_integration", "API Integration", 0.15),
    ("ai_integration", "AI Integration", 0.20),
    ("bug_fixing", "Bug Fixing & Optimization", 0.20),
    ("feature_addition", "Feature Implementation", 0.25),
    ("testing", "Testing & QA", 0.10),
    ("deployment", "Deployment & DevOps", 0.10),
]

DEFAULT_BREAKDOWN = [
    ("Frontend Development", 0.32),
    ("Backend Development", 0.28),
    ("Database", 0.12),
    ("API Integrations", 0.17),
    ("Testing & Deployment", 0.11),
]


def _legacy_estimate(payload: EstimateInput, analysis: dict, user: dict | None = None) -> dict:
    features = analysis.get("features", {})
    all_features = features.get("mvp", []) + features.get("advanced", []) + features.get("optional", [])
    scope = analysis.get("work_scope") or {}

    active = []
    for key, label, weight in SCOPE_ITEMS:
        if scope.get(key):
            active.append((label, weight))

    if not active:
        active = DEFAULT_BREAKDOWN

    total_weight = sum(w for _, w in active)
    breakdown = [(label, round(w / total_weight, 3)) for label, w in active]

    pricing = analysis.get("pricing", {})
    typical = pricing.get("typical", 15000)
    budget = pricing.get("budget", round(typical * 0.8))
    premium = pricing.get("premium", round(typical * 1.3))
    timeline = analysis.get("timeline", {"weeks": 2, "hours": 40})
    created_at = datetime.now(timezone.utc)
    return {
        "id": f"est_{int(time.time() * 1000):x}{uuid.uuid4().hex[:6]}",
        "createdAt": created_at.isoformat().replace("+00:00", "Z"),
        "created_at": created_at,
        "updatedAt": created_at.isoformat().replace("+00:00", "Z"),
        "status": "completed",
        "user_email": user.get("email") if user else None,
        "project_category": analysis.get("project_category", "Custom Web Project"),
        "pricing": pricing,
        "timeline": timeline,
        "technology": [item.get("recommendation", "") for item in analysis.get("technology", [])],
        "input": payload.model_dump(),
        "costMin": budget,
        "costMax": premium,
        "weeksMin": max(1, round(timeline.get("weeks", 2) * 0.8)),
        "weeksMax": max(1, round(timeline.get("weeks", 2) * 1.2)),
        "complexity": analysis.get("complexity", {}).get("level", "Medium"),
        "breakdown": [
            {"label": label, "min": round(budget * share), "max": round(premium * share)}
            for label, share in breakdown
        ],
        "detectedFeatures": [item.get("name", "") for item in all_features],
        "stack": [
            {"layer": item.get("layer", ""), "value": item.get("recommendation", "")}
            for item in analysis.get("technology", [])
        ],
        "analysis": analysis.get("summary", ""),
        "aiAnalysis": analysis,
        "pricingTypical": typical,
    }


@router.post("/estimate")
async def create_estimate(payload: EstimateInput, request: Request, user=Depends(get_optional_user)):
    if not (payload.description or "").strip() and not payload.features:
        raise HTTPException(status_code=422, detail="Describe the project or add at least one feature.")
    try:
        analysis = await analyze_project(payload, db=request.app.state.db)
        estimate = _legacy_estimate(payload, analysis.model_dump(), user)
        try:
            await request.app.state.db.estimates.insert_one(estimate.copy())
        except Exception:
            pass
        return estimate
    except HTTPException:
        raise
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate estimate: {str(exc)}") from exc


@router.get("/estimates")
async def list_estimates(request: Request, user=Depends(get_optional_user)):
    try:
        query = {}
        if user and user.get("email"):
            query["user_email"] = user["email"]
        else:
            # Not logged in — return empty list instead of all estimates
            return []
        estimates = await request.app.state.db.estimates.find(query, {"_id": 0}).sort("createdAt", -1).to_list(50)
        for estimate in estimates:
            estimate.pop("created_at", None)
        return estimates
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Estimate history is unavailable.") from exc


@router.get("/estimates/{estimate_id}")
async def get_estimate(estimate_id: str, request: Request, user=Depends(get_optional_user)):
    query = {"id": estimate_id}
    if user and user.get("email"):
        query["user_email"] = user["email"]
    estimate = await request.app.state.db.estimates.find_one(query, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found.")
    return estimate
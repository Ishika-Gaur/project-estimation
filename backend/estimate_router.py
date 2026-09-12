import time
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request

from ai_service import analyze_project
from auth import get_optional_user
from models import EstimateInput


router = APIRouter(prefix="/api", tags=["estimates"])


def _legacy_estimate(payload: EstimateInput, analysis: dict, user: dict | None = None) -> dict:
    features = analysis["features"]
    all_features = features["mvp"] + features["advanced"] + features["optional"]
    breakdown = [
        ("Frontend Development", 0.32),
        ("Backend Development", 0.28),
        ("Database", 0.12),
        ("API Integrations", 0.17),
        ("Testing & Deployment", 0.11),
    ]
    typical = analysis["pricing"]["typical"]
    budget = analysis["pricing"]["budget"]
    premium = analysis["pricing"]["premium"]
    timeline = analysis["timeline"]
    created_at = datetime.now(timezone.utc)
    return {
        "id": f"est_{int(time.time() * 1000):x}{uuid.uuid4().hex[:6]}",
        "createdAt": created_at.isoformat().replace("+00:00", "Z"),
        "created_at": created_at,
        "updatedAt": created_at.isoformat().replace("+00:00", "Z"),
        "status": "completed",
        "user_email": user.get("email") if user else None,
        "project_category": analysis["project_category"],
        "pricing": analysis["pricing"],
        "timeline": analysis["timeline"],
        "technology": [item["recommendation"] for item in analysis["technology"]],
        "input": payload.model_dump(),
        "costMin": budget,
        "costMax": premium,
        "weeksMin": max(1, round(timeline["weeks"] * 0.8)),
        "weeksMax": max(1, round(timeline["weeks"] * 1.2)),
        "complexity": analysis["complexity"]["level"],
        "breakdown": [
            {"label": label, "min": round(budget * share), "max": round(premium * share)}
            for label, share in breakdown
        ],
        "detectedFeatures": [item["name"] for item in all_features],
        "stack": [
            {"layer": item["layer"], "value": item["recommendation"]}
            for item in analysis["technology"]
        ],
        "analysis": analysis["summary"],
        "aiAnalysis": analysis,
        "pricingTypical": typical,
    }


@router.post("/estimate")
async def create_estimate(payload: EstimateInput, request: Request, user=Depends(get_optional_user)):
    if not payload.description.strip() and not payload.features:
        raise HTTPException(status_code=422, detail="Describe the project or add at least one feature.")
    try:
        analysis = await analyze_project(payload, db=request.app.state.db)
        estimate = _legacy_estimate(payload, analysis.model_dump(), user)
        try:
            await request.app.state.db.estimates.insert_one(estimate.copy())
        except Exception:
            pass
        return estimate
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.get("/estimates")
async def list_estimates(request: Request):
    try:
        estimates = await request.app.state.db.estimates.find({}, {"_id": 0}).sort("createdAt", -1).to_list(50)
        for estimate in estimates:
            estimate.pop("created_at", None)
        return estimates
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Estimate history is unavailable.") from exc


@router.get("/estimates/{estimate_id}")
async def get_estimate(estimate_id: str, request: Request):
    estimate = await request.app.state.db.estimates.find_one({"id": estimate_id}, {"_id": 0})
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found.")
    return estimate
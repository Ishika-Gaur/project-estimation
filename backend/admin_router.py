from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request

from auth import require_admin
from models import AdminPage, AdminRoleUpdate

router = APIRouter(prefix="/api/admin", tags=["admin"])


def _date_filter(date_from: str | None, date_to: str | None) -> dict:
    clauses = []
    if date_from:
        clauses.append({"$gte": date_from})
    if date_to:
        clauses.append({"$lte": f"{date_to}T23:59:59.999Z"})
    if not clauses:
        return {}
    bounds = {key: value for clause in clauses for key, value in clause.items()}
    return {"$or": [{"createdAt": bounds}, {"created_at": bounds}]}


def _scope_filter(category: str | None = None, complexity: str | None = None, date_from: str | None = None, date_to: str | None = None) -> dict:
    filters = []
    if category:
        filters.append({"$or": [{"project_category": category}, {"aiAnalysis.project_category": category}, {"input.projectType": category}]})
    if complexity:
        filters.append({"complexity": complexity})
    date_filter = _date_filter(date_from, date_to)
    if date_filter:
        filters.append(date_filter)
    return {"$and": filters} if filters else {}


def _estimate_projection() -> dict:
    return {
        "_id": 0,
        "id": 1,
        "createdAt": 1,
        "user_email": 1,
        "input": 1,
        "complexity": 1,
        "costMin": 1,
        "costMax": 1,
        "weeksMin": 1,
        "weeksMax": 1,
        "breakdown": 1,
        "detectedFeatures": 1,
        "stack": 1,
        "analysis": 1,
        "aiAnalysis": 1,
        "pricing": 1,
        "timeline": 1,
        "project_category": 1,
        "technology": 1,
    }


def _clean(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat().replace("+00:00", "Z")
    if isinstance(value, dict):
        return {key: _clean(item) for key, item in value.items() if key != "_id"}
    if isinstance(value, list):
        return [_clean(item) for item in value]
    return value


async def _summary(db, match: dict) -> dict:
    pipeline = [
        {"$match": match},
        {"$project": {
            "category": {"$ifNull": ["$project_category", {"$ifNull": ["$aiAnalysis.project_category", {"$ifNull": ["$input.projectType", "Other"]}]}]},
            "complexity": {"$ifNull": ["$complexity", "Unknown"]},
            "typical": {"$ifNull": ["$pricing.typical", {"$ifNull": ["$pricingTypical", "$aiAnalysis.pricing.typical"]}]},
            "premium": {"$ifNull": ["$pricing.premium", "$costMax"]},
            "budget": {"$ifNull": ["$pricing.budget", "$costMin"]},
            "weeks": {"$ifNull": ["$timeline.weeks", {"$divide": [{"$add": ["$weeksMin", "$weeksMax"]}, 2]}]},
        }},
        {"$group": {
            "_id": None,
            "total": {"$sum": 1},
            "average_budget": {"$avg": "$budget"},
            "average_typical": {"$avg": "$typical"},
            "average_premium": {"$avg": "$premium"},
            "average_duration_weeks": {"$avg": "$weeks"},
        }},
    ]
    result = await db.estimates.aggregate(pipeline).to_list(1)
    return result[0] if result else {"total": 0, "average_budget": 0, "average_typical": 0, "average_premium": 0, "average_duration_weeks": 0}


async def _groups(db, field: str, match: dict) -> list:
    pipeline = [
        {"$match": match},
        {"$project": {
            "value": field,
            "category": {"$ifNull": ["$project_category", {"$ifNull": ["$aiAnalysis.project_category", "$input.projectType"]}]},
            "complexity": 1,
            "typical": {"$ifNull": ["$pricing.typical", {"$ifNull": ["$pricingTypical", "$aiAnalysis.pricing.typical"]}]},
            "technology": {"$ifNull": ["$technology", "$aiAnalysis.technology.recommendation"]},
        }},
        *([{"$unwind": "$value"}] if field in {"$technology", "$detectedFeatures"} else []),
        {"$group": {"_id": "$value", "count": {"$sum": 1}, "average_price": {"$avg": "$typical"}}},
        {"$sort": {"count": -1}},
        {"$limit": 25},
    ]
    rows = await db.estimates.aggregate(pipeline).to_list(25)
    return [{"label": row.get("_id") or "Unknown", "count": row["count"], "average_price": round(row.get("average_price") or 0)} for row in rows]


async def _time_groups(db, match: dict) -> list:
    rows = await db.estimates.aggregate([
        {"$match": match},
        {"$project": {"day": {"$substr": ["$createdAt", 0, 10]}}},
        {"$group": {"_id": "$day", "count": {"$sum": 1}}},
        {"$sort": {"_id": 1}},
        {"$limit": 31},
    ]).to_list(31)
    return [{"label": row.get("_id") or "Unknown", "count": row["count"]} for row in rows]


async def _price_groups(db, match: dict) -> list:
    rows = await db.estimates.aggregate([
        {"$match": match},
        {"$project": {"price": {"$ifNull": ["$pricing.typical", {"$ifNull": ["$pricingTypical", "$aiAnalysis.pricing.typical"]}]}}},
        {"$bucket": {"groupBy": "$price", "boundaries": [0, 50000, 100000, 250000, 500000, 1000000, 100000000], "default": "₹1Cr+", "output": {"count": {"$sum": 1}}}},
    ]).to_list(10)
    labels = {0: "Under ₹50k", 50000: "₹50k–₹1L", 100000: "₹1L–₹2.5L", 250000: "₹2.5L–₹5L", 500000: "₹5L–₹10L", 1000000: "₹10L+"}
    return [{"label": labels.get(row.get("_id"), row.get("_id", "Unknown")), "count": row["count"]} for row in rows]


@router.get("/dashboard")
async def dashboard(request: Request, _admin=Depends(require_admin)):
    db = request.app.state.db
    now = datetime.now(timezone.utc)
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    week = today - timedelta(days=today.weekday())
    month = today.replace(day=1)
    total = await _summary(db, {})
    counts = {}
    for label, start in (("today", today), ("week", week), ("month", month)):
        counts[label] = await db.estimates.count_documents({"created_at": {"$gte": start}})
    recent = await db.estimates.find({}, _estimate_projection()).sort("createdAt", -1).limit(10).to_list(10)
    return {
        "total_estimates": total.get("total", 0),
        "estimates_today": counts["today"],
        "estimates_this_week": counts["week"],
        "estimates_this_month": counts["month"],
        "total_users": await db.users.count_documents({}),
        "average_budget": round(total.get("average_budget") or 0),
        "average_typical": round(total.get("average_typical") or 0),
        "average_premium": round(total.get("average_premium") or 0),
        "average_duration_weeks": round(total.get("average_duration_weeks") or 0, 1),
        "categories": await _groups(db, "$category", {}),
        "complexity": await _groups(db, "$complexity", {}),
        "technologies": await _groups(db, "$technology", {}),
        "estimates_over_time": await _time_groups(db, {}),
        "price_ranges": await _price_groups(db, {}),
        "recent_estimates": [_clean(item) for item in recent],
    }


@router.get("/estimates", response_model=AdminPage)
async def admin_estimates(
    request: Request,
    search: str | None = None,
    category: str | None = None,
    complexity: str | None = None,
    date_from: str | None = None,
    date_to: str | None = None,
    sort: str = Query("createdAt", pattern="^(createdAt|costMin|costMax|complexity)$"),
    order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin=Depends(require_admin),
):
    match = _scope_filter(category, complexity, date_from, date_to)
    if search:
        match.setdefault("$and", []).append({"$or": [
            {"id": {"$regex": search, "$options": "i"}},
            {"input.projectName": {"$regex": search, "$options": "i"}},
            {"user_email": {"$regex": search, "$options": "i"}},
        ]})
    db = request.app.state.db
    total = await db.estimates.count_documents(match)
    direction = -1 if order == "desc" else 1
    rows = await db.estimates.find(match, _estimate_projection()).sort(sort, direction).skip((page - 1) * page_size).limit(page_size).to_list(page_size)
    return {"items": [_clean(row) for row in rows], "page": page, "page_size": page_size, "total": total, "pages": (total + page_size - 1) // page_size}


@router.get("/estimates/{estimate_id}")
async def admin_estimate_detail(estimate_id: str, request: Request, _admin=Depends(require_admin)):
    estimate = await request.app.state.db.estimates.find_one({"id": estimate_id}, _estimate_projection())
    if not estimate:
        raise HTTPException(status_code=404, detail="Estimate not found.")
    return _clean(estimate)


@router.get("/users", response_model=AdminPage)
async def admin_users(
    request: Request,
    search: str | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    _admin=Depends(require_admin),
):
    match = {"email": {"$regex": search, "$options": "i"}} if search else {}
    db = request.app.state.db
    total = await db.users.count_documents(match)
    pipeline = [
        {"$match": match},
        {"$project": {"_id": 0, "password_hash": 0}},
        {"$lookup": {"from": "estimates", "localField": "email", "foreignField": "user_email", "as": "estimate_docs"}},
        {"$addFields": {"estimate_count": {"$size": "$estimate_docs"}, "last_activity": {"$max": "$estimate_docs.createdAt"}}},
        {"$project": {"estimate_docs": 0}},
        {"$sort": {"created_at": -1}},
        {"$skip": (page - 1) * page_size},
        {"$limit": page_size},
    ]
    rows = await db.users.aggregate(pipeline).to_list(page_size)
    return {"items": [_clean(row) for row in rows], "page": page, "page_size": page_size, "total": total, "pages": (total + page_size - 1) // page_size}


@router.get("/users/{email}")
async def admin_user_detail(email: str, request: Request, _admin=Depends(require_admin)):
    user = await request.app.state.db.users.find_one({"email": email.lower()}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    estimates = await request.app.state.db.estimates.find({"user_email": email.lower()}, _estimate_projection()).sort("createdAt", -1).to_list(100)
    user["estimates"] = [_clean(item) for item in estimates]
    return _clean(user)


@router.delete("/estimates/{estimate_id}")
async def delete_estimate(estimate_id: str, request: Request, admin=Depends(require_admin)):
    result = await request.app.state.db.estimates.delete_one({"id": estimate_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Estimate not found.")
    return {"message": "Estimate deleted successfully"}


@router.delete("/estimates")
async def delete_estimates_bulk(request: Request, body: dict, admin=Depends(require_admin)):
    ids = body.get("ids", [])
    if not ids:
        raise HTTPException(status_code=400, detail="No estimate IDs provided.")
    result = await request.app.state.db.estimates.delete_many({"id": {"$in": ids}})
    return {"message": f"Deleted {result.deleted_count} estimates"}


@router.patch("/users/{email}/role")
async def update_user_role(email: str, request: Request, body: AdminRoleUpdate, admin=Depends(require_admin)):
    role = body.role
    if email.lower() == admin["email"] and role != "admin":
        raise HTTPException(status_code=400, detail="You cannot remove your own admin access.")
    result = await request.app.state.db.users.update_one(
        {"email": email.lower()}, {"$set": {"role": role}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found.")
    return {"email": email.lower(), "role": role}
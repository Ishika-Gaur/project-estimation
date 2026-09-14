import json
import os
import asyncio

import httpx

from models import AIAnalysis, EstimateInput, PricingEstimate
from market_rate_service import get_active_snapshot, SEED_BANDS


GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"
FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3.8-flash", "gemini-3.5-flash-lite", "gemini-3.6-flash"]


async def _call_gemini_with_fallback(body: dict, primary_model: str, api_key: str) -> dict:
    models_to_try = [primary_model] + [m for m in FALLBACK_MODELS if m != primary_model]
    last_exc = None

    async with httpx.AsyncClient(timeout=90) as client:
        for current_model in models_to_try:
            for attempt in range(2):
                try:
                    response = await client.post(
                        f"{GEMINI_API_URL}/{current_model}:generateContent",
                        params={"key": api_key},
                        headers={"Content-Type": "application/json"},
                        json=body,
                    )
                    if response.status_code == 200:
                        content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
                        return json.loads(content)

                    print(f"[CostifyAI] Gemini ({current_model}) returned HTTP {response.status_code}: {response.text[:180]}")
                    if response.status_code in {429, 404, 503}:
                        break
                    elif response.status_code in {500, 502, 504}:
                        await asyncio.sleep(1 + attempt)
                    else:
                        response.raise_for_status()
                except (KeyError, IndexError, json.JSONDecodeError) as exc:
                    print(f"[CostifyAI] Parse error with {current_model}: {exc}")
                    last_exc = exc
                    break
                except Exception as exc:
                    last_exc = exc
                    if attempt == 0:
                        await asyncio.sleep(1)

    raise RuntimeError(f"AI service unavailable across models. Last error: {last_exc}")


ANALYSIS_SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "properties": {
        "project_category": {"type": "string"},
        "summary": {"type": "string"},
        "requirements": {"type": "array", "items": {"type": "string"}},
        "missing_or_unclear": {"type": "array", "items": {"type": "string"}},
        "features": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "mvp": {"type": "array", "items": {"$ref": "#/$defs/feature"}},
                "advanced": {"type": "array", "items": {"$ref": "#/$defs/feature"}},
                "optional": {"type": "array", "items": {"$ref": "#/$defs/feature"}},
            },
            "required": ["mvp", "advanced", "optional"],
        },
        "technology": {
            "type": "array",
            "items": {"$ref": "#/$defs/technology"},
        },

        "complexity": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "level": {"type": "string"},
                "score": {"type": "integer"},
                "reason": {"type": "string"},
            },
            "required": ["level", "score", "reason"],
        },

        "timeline": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "hours": {"type": "integer"},
                "days": {"type": "integer"},
                "weeks": {"type": "number"},
                "mvp": {"type": "string"},
            },
            "required": ["hours", "days", "weeks", "mvp"],
        },

        "pricing": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "budget": {"type": "integer"},
                "typical": {"type": "integer"},
                "premium": {"type": "integer"},
                "mvp": {"type": "integer"},
                "currency": {"type": "string"},
                "explanation": {"type": "string"},
            },
            "required": ["budget", "typical", "premium", "mvp", "currency", "explanation"],
        },

        "market_analysis": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "demand": {"type": "string"},
                "trends": {"type": "array", "items": {"type": "string"}},
                "notes": {"type": "string"},
            },
            "required": ["demand", "trends", "notes"],
        },

        "suggestions": {"type": "array", "items": {"$ref": "#/$defs/suggestion"}},
        "work_scope": {"$ref": "#/$defs/work_scope"},
    },

    "required": [
        "project_category", "summary", "requirements", "missing_or_unclear", "features",
        "technology", "complexity", "timeline", "pricing", "market_analysis", "suggestions",
        "work_scope",
    ],

    "$defs": {
        "feature": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "name": {"type": "string"}, "description": {"type": "string"},
                "complexity": {"type": "string"}, "estimated_hours": {"type": "integer"},
            }, "required": ["name", "description", "complexity", "estimated_hours"],
        },

        "technology": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "layer": {"type": "string"}, "recommendation": {"type": "string"},
                "reason": {"type": "string"},
            }, "required": ["layer", "recommendation", "reason"],
        },

        "work_scope": {
    "type": "object",
    "properties": {
        "frontend": {"type": "boolean"},
        "backend": {"type": "boolean"},
        "database": {"type": "boolean"},
        "api_integration": {"type": "boolean"},
        "ai_integration": {"type": "boolean"},
        "bug_fixing": {"type": "boolean"},
        "feature_addition": {"type": "boolean"},
        "testing": {"type": "boolean"},
        "deployment": {"type": "boolean"}
    },
    "required": [
        "frontend",
        "backend",
        "database",
        "api_integration",
        "ai_integration",
        "bug_fixing",
        "feature_addition",
        "testing",
        "deployment"
    ]
},

        "suggestion": {
            "type": "object", "additionalProperties": False,
            "properties": {
                "title": {"type": "string"}, "description": {"type": "string"},
                "reason": {"type": "string"}, "complexity": {"type": "string"},
                "additional_cost": {"type": "string"}, "additional_time": {"type": "string"},
            }, "required": ["title", "description", "reason", "complexity", "additional_cost", "additional_time"],
        },
    },
}


# Domestic India-market delivery bands in INR/hour. They are deliberately
# conservative and reflect different engagement overheads, not project type.
INDIA_RATE_BANDS = {
    "freelancer": (600, 1_200, 2_200),
    "startup": (900, 1_600, 2_600),
    "small-business": (1_200, 2_000, 3_200),
    "agency-enterprise": (1_600, 2_800, 4_500),
}


def _round_inr(amount: int) -> int:
    return max(1_000, round(amount / 1_000) * 1_000)


def _apply_india_market_pricing(payload: EstimateInput, analysis: AIAnalysis, market_snapshot: dict | None = None) -> AIAnalysis:
    """Price the AI-derived scope with transparent, domestic India rate bands.

    Uses the latest validated market snapshot from MongoDB when available;
    falls back to the hard-coded INDIA_RATE_BANDS (= SEED_BANDS) otherwise.
    """
    # Determine rate source
    snapshot_rates = None
    source_info = None
    if market_snapshot and market_snapshot.get("rates"):
        rates_dict = market_snapshot["rates"]
        buyer_key = payload.buyerType
        if buyer_key in rates_dict:
            raw = rates_dict[buyer_key]
            # rates_dict values may be list or tuple of (budget, typical, premium)
            snapshot_rates = tuple(int(v) for v in raw)
        source_info = {
            "status": market_snapshot.get("status", "seed"),
            "source_count": market_snapshot.get("source_count", 0),
            "collected_at": market_snapshot.get("collected_at"),
            "methodology_version": market_snapshot.get("methodology_version"),
        }

    if snapshot_rates and len(snapshot_rates) == 3:
        budget_rate, typical_rate, premium_rate = snapshot_rates
    else:
        budget_rate, typical_rate, premium_rate = INDIA_RATE_BANDS.get(
            payload.buyerType, INDIA_RATE_BANDS["freelancer"]
        )
        source_info = {"status": "seed", "source_count": 0, "collected_at": None, "methodology_version": None}

    hours = max(1, analysis.timeline.hours)

    desc = (payload.description or "").lower()
    is_simple_frontend = (
        ("only frontend" in desc or "frontend only" in desc or "just frontend" in desc or "portfolio" in desc or "landing page" in desc or "static" in desc)
        and not any(term in desc for term in ["backend", "database", "full stack", "fullstack", "ecommerce", "e-commerce"])
    )
    if is_simple_frontend:
        hours = min(hours, 10)
        hours = max(hours, 6)
    elif analysis.complexity.level == "Simple":
        hours = min(hours, 20)
    elif analysis.complexity.level == "Medium":
        hours = min(hours, 50)
    elif analysis.complexity.level == "Complex":
        hours = min(hours, 120)

    # Build the explanation with market metadata
    rate_basis = "current Indian market benchmarks" if source_info.get("status") == "active" else "default Indian market benchmarks"
    collected_at_str = ""
    if source_info.get("collected_at"):
        from datetime import datetime
        dt = source_info["collected_at"]
        if isinstance(dt, datetime):
            collected_at_str = dt.strftime("%d %b %Y")
        else:
            collected_at_str = str(dt)

    explanation_parts = [
        f"India domestic-market estimate: {hours} scoped hours × ₹{budget_rate:,}/hr, "
        f"₹{typical_rate:,}/hr, and ₹{premium_rate:,}/hr for budget, typical, and premium delivery.",
        f"Rate basis: Estimated using {rate_basis}.",
    ]
    if source_info.get("source_count", 0) > 0:
        explanation_parts.append(f"Sources: {source_info['source_count']} verified sources.")
    if collected_at_str:
        explanation_parts.append(f"Market rates last updated: {collected_at_str}.")
    explanation_parts.append("Excludes GST, third-party subscriptions, cloud usage, and paid services.")

    pricing = PricingEstimate(
        budget=_round_inr(hours * budget_rate),
        typical=_round_inr(hours * typical_rate),
        premium=_round_inr(hours * premium_rate),
        mvp=_round_inr(hours * typical_rate * 0.6),
        currency="INR",
        explanation=" ".join(explanation_parts),
    )
    updated_timeline = analysis.timeline.model_copy(update={
        "hours": hours,
        "days": max(1, round(hours / 6)),
        "weeks": round(max(0.5, hours / 30), 1),
    })
    return analysis.model_copy(update={"pricing": pricing, "timeline": updated_timeline})


def _gemini_response_schema(schema: dict) -> dict:
    """Convert local JSON Schema references to Gemini's response-schema subset."""
    definitions = schema.get("$defs", {})

    def normalize(value):
        if isinstance(value, list):
            return [normalize(item) for item in value]
        if not isinstance(value, dict):
            return value
        if "$ref" in value:
            reference = value["$ref"].removeprefix("#/$defs/")
            return normalize(definitions[reference])
        return {
            key: normalize(item)
            for key, item in value.items()
            if key not in {"$defs", "additionalProperties"}
        }

    return normalize(schema)


def _prompt(payload: EstimateInput) -> str:
    return json.dumps({
        "title": payload.projectName,
        "for": payload.buyerType,
        "users": payload.audience,
        "platforms": payload.platforms,
        "description": payload.description,
        "github_url": payload.github_url,
        "deployed_url": payload.deployed_url,
        "selected_technologies_and_features": payload.features,
    }, ensure_ascii=False)


async def analyze_project(payload: EstimateInput, db=None) -> AIAnalysis:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")

    # Fetch latest market rates from DB (or fall back to seed)
    market_snapshot = None
    if db is not None:
        try:
            market_snapshot = await get_active_snapshot(db)
        except Exception:
            pass  # DB unavailable — will use SEED_BANDS fallback

    system_prompt = (
        "You are a senior software architect and project cost estimator for the Indian market. "
        "Understand English, Hindi, Hinglish, and mixed-language requirements.\n\n"
        "IMPORTANT: Estimate ONLY what the user actually asks for. "
        "Do not assume extra development work. "
        "Do not turn a small contribution into a complete project estimate.\n\n"
        "CRITICAL WORK_SCOPE RULES:\n"
        "1. USER DESCRIPTION TAKES TOP PRIORITY: If the user description states 'only frontend', 'frontend only', 'just frontend', "
        "'portfolio', or 'landing page', you MUST set:\n"
        "   - work_scope.frontend = true\n"
        "   - work_scope.backend = false\n"
        "   - work_scope.database = false\n"
        "   - work_scope.api_integration = false\n"
        "   - work_scope.ai_integration = false\n"
        "   - work_scope.testing = true\n"
        "   - work_scope.deployment = true\n"
        "   Do NOT include API Integration, backend APIs, or database in the scope or breakdown.\n"
        "2. If the user asks only for backend logic, do NOT estimate frontend development.\n"
        "3. If the user asks only to integrate AI into an existing project, estimate only the AI integration.\n"
        "4. A GitHub URL or deployed URL means an existing project may already exist. Do NOT assume the entire project needs to be rebuilt.\n"
        "5. For a simple frontend portfolio or landing page, keep the hours small (6–12 hours total, 1–2 days) and complexity 'Simple'.\n"
        "6. Return realistic INR estimates. Complexity must be Simple, Medium, Complex, or Enterprise. Never claim live web research."
    )
    model = os.getenv("AI_MODEL", "gemini-3.5-flash")
    body = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": _prompt(payload)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
            "responseSchema": _gemini_response_schema(ANALYSIS_SCHEMA),
        },
    }
    try:
        content_dict = await _call_gemini_with_fallback(body, model, api_key)
        analysis = AIAnalysis.model_validate(content_dict)

        # Enforce deterministic work_scope if description explicitly requests frontend-only / portfolio
        desc = (payload.description or "").lower()
        is_frontend_only = (
            ("only frontend" in desc or "frontend only" in desc or "just frontend" in desc or "no backend" in desc)
            and not any(term in desc for term in ["backend logic", "with backend", "fullstack", "full stack"])
        )
        if is_frontend_only and analysis.work_scope:
            analysis.work_scope.frontend = True
            analysis.work_scope.backend = False
            analysis.work_scope.database = False
            analysis.work_scope.api_integration = False
            analysis.work_scope.ai_integration = False
            analysis.work_scope.testing = True
            analysis.work_scope.deployment = True
            analysis.complexity.level = "Simple"
            analysis.complexity.score = min(analysis.complexity.score, 3)

        return _apply_india_market_pricing(payload, analysis, market_snapshot)
    except Exception as exc:
        raise RuntimeError(f"The AI provider returned an invalid or unavailable response: {exc}") from exc

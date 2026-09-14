import json
import os
import re
import asyncio
from typing import List

import httpx

from models import (
    AIAnalysis,
    BreakdownItem,
    EstimateInput,
    FeatureBuckets,
    FeatureEstimate,
    PricingEstimate,
    TechnologyRecommendation,
    WorkScope,
)
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
        "custom_breakdown": {
            "type": "array",
            "items": {"$ref": "#/$defs/breakdown_item"},
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
        "technology", "custom_breakdown", "complexity", "timeline", "pricing", "market_analysis", "suggestions",
        "work_scope",
    ],
    "$defs": {
        "feature": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "name": {"type": "string"},
                "description": {"type": "string"},
                "complexity": {"type": "string"},
                "estimated_hours": {"type": "integer"},
            },
            "required": ["name", "description", "complexity", "estimated_hours"],
        },
        "technology": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "layer": {"type": "string"},
                "recommendation": {"type": "string"},
                "reason": {"type": "string"},
            },
            "required": ["layer", "recommendation", "reason"],
        },
        "breakdown_item": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "label": {"type": "string"},
                "percentage": {"type": "integer"},
                "explanation": {"type": "string"},
            },
            "required": ["label", "percentage"],
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
                "deployment": {"type": "boolean"},
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
                "deployment",
            ],
        },
        "suggestion": {
            "type": "object",
            "additionalProperties": False,
            "properties": {
                "title": {"type": "string"},
                "description": {"type": "string"},
                "reason": {"type": "string"},
                "complexity": {"type": "string"},
                "additional_cost": {"type": "string"},
                "additional_time": {"type": "string"},
            },
            "required": ["title", "description", "reason", "complexity", "additional_cost", "additional_time"],
        },
    },
}


# Domestic India-market delivery bands in INR/hour.
INDIA_RATE_BANDS = {
    "freelancer": (600, 1_200, 2_200),
    "startup": (900, 1_600, 2_600),
    "small-business": (1_200, 2_000, 3_200),
    "agency-enterprise": (1_600, 2_800, 4_500),
}


def _round_inr(amount: int) -> int:
    return max(1_000, round(amount / 1_000) * 1_000)


def _detect_scope_type(payload: EstimateInput) -> str:
    """Detect the exact scope intent from the user's description and features."""
    desc = (payload.description or "").lower().strip()
    features_str = " ".join(payload.features or []).lower().strip()
    text = f"{desc} {features_str}"

    # Check for explicit full-stack / both frontend & backend
    has_both = (
        ("frontend and backend" in text or "backend and frontend" in text or "full stack" in text or "fullstack" in text)
        and not any(neg in text for neg in ["no backend", "no frontend", "without backend", "without frontend", "existing backend", "existing frontend"])
    )
    if has_both:
        return "full_stack"

    # Specific feature integration into an existing site/app
    payment_keywords = ["payment gateway", "razorpay", "stripe", "integrate payment", "checkout gateway", "payment integration"]
    if any(k in text for k in payment_keywords) and any(
        k in text for k in ["existing", "readymade", "integrate", "add payment", "into website", "into app", "only payment", "existing website", "existing project"]
    ):
        return "payment_integration"

    ai_keywords = ["integrate ai", "add ai", "ai chatbot", "openai api", "llm integration", "integrate chatgpt", "add chatbot"]
    if any(k in text for k in ai_keywords) and any(
        k in text for k in ["existing", "integrate", "add to", "into my", "into app", "into website"]
    ):
        return "ai_integration"

    if any(k in text for k in ["bug fix", "fix bug", "debugging", "code audit", "optimize performance", "refactor code"]) and not any(
        k in text for k in ["build new", "create app", "full app", "scratch"]
    ):
        return "bug_fixing"

    if any(k in text for k in ["only database", "database only", "database design", "sql schema", "mongodb schema", "db migration"]):
        return "database_only"

    # Frontend only check:
    frontend_triggers = [
        "only frontend", "frontend only", "just frontend", "frontend developer",
        "ui only", "just ui", "react frontend", "next.js frontend", "nextjs frontend",
        "vue frontend", "html css", "html/css", "tailwind", "figma to html", "figma to code",
        "portfolio", "landing page", "client side only", "no backend", "without backend",
        "static site", "static website", "redesign frontend", "redesign ui", "ui design",
        "convert figma", "frontend for", "frontend website", "frontend design"
    ]
    is_frontend = any(t in text for t in frontend_triggers)
    backend_unrequested = (
        not any(b in text for b in ["backend logic", "build backend", "create api", "server endpoints", "database architecture", "fastapi backend", "node backend", "express backend"])
        or any(b in text for b in ["no backend", "without backend", "existing backend", "backend is ready", "backend already built", "backend done"])
    )
    if is_frontend and backend_unrequested:
        return "frontend_only"

    # Backend only check:
    backend_triggers = [
        "only backend", "backend only", "just backend", "backend developer",
        "api only", "only api", "just api", "rest api", "graphql api",
        "fastapi backend", "node backend", "express backend", "django backend",
        "spring boot", "backend service", "microservice", "no frontend", "without frontend",
        "backend logic", "database and backend", "server side only", "build api", "create endpoints",
        "api endpoints", "backend system"
    ]
    is_backend = any(t in text for t in backend_triggers)
    frontend_unrequested = (
        not any(f in text for f in ["frontend design", "ui components", "build frontend", "landing page", "react app", "ui screens", "html/css"])
        or any(f in text for f in ["no frontend", "without frontend", "existing frontend", "frontend is ready", "frontend already built", "ui already done", "ui done"])
    )
    if is_backend and frontend_unrequested:
        return "backend_only"

    return "general"


def _enforce_scope_intent(payload: EstimateInput, analysis: AIAnalysis) -> AIAnalysis:
    """Strictly align every outcome (work_scope, custom_breakdown, technology,

    features, and project_category) with the user's explicit scope intent.
    """
    scope_type = _detect_scope_type(payload)
    current_scope = analysis.work_scope or WorkScope()

    if scope_type == "frontend_only":
        # 1. Scope booleans: STRICTLY frontend, no backend, no DB, no backend API
        updated_scope = current_scope.model_copy(update={
            "frontend": True,
            "backend": False,
            "database": False,
            "api_integration": False,
            "ai_integration": False,
            "bug_fixing": False,
            "feature_addition": True,
            "testing": True,
            "deployment": True,
        })
        category = "Frontend Application" if "portfolio" not in (payload.description or "").lower() else "Portfolio / Landing Page"

        # 2. Technology: remove backend/database items
        clean_tech = []
        backend_markers = {"backend", "database", "node", "express", "fastapi", "django", "flask", "postgres", "mongo", "mysql", "redis", "sql", "orm", "server"}
        for t in analysis.technology:
            layer_l = t.layer.lower()
            rec_l = t.recommendation.lower()
            if not any(m in layer_l or m in rec_l for m in backend_markers):
                clean_tech.append(t)

        if not clean_tech:
            clean_tech = [
                TechnologyRecommendation(layer="Frontend", recommendation="React / Next.js", reason="Modern, reactive component architecture"),
                TechnologyRecommendation(layer="Styling", recommendation="Tailwind CSS", reason="Utility-first responsive styling and fast iteration"),
                TechnologyRecommendation(layer="Hosting", recommendation="Vercel / Netlify", reason="Instant global edge CDN deployment"),
            ]

        # 3. Features: strip backend/database features
        def is_frontend_feature(f: FeatureEstimate) -> bool:
            name_l = f.name.lower()
            desc_l = f.description.lower()
            return not any(m in name_l or m in desc_l for m in ["backend api", "database setup", "server endpoint", "database schema", "jwt backend", "sql query", "mongo"])

        clean_mvp = [f for f in analysis.features.mvp if is_frontend_feature(f)]
        if not clean_mvp:
            clean_mvp = [
                FeatureEstimate(name="Responsive UI Layout", description="Pixel-perfect component hierarchy for mobile, tablet, and desktop", complexity="Simple", estimated_hours=4),
                FeatureEstimate(name="Interactive Client State", description="Reactive state management, form validations, and user event handling", complexity="Simple", estimated_hours=4),
            ]
        clean_adv = [f for f in analysis.features.advanced if is_frontend_feature(f)]
        clean_opt = [f for f in analysis.features.optional if is_frontend_feature(f)]

        # 4. Breakdown: strictly frontend tasks
        clean_breakdown = []
        for b in (analysis.custom_breakdown or []):
            b_l = b.label.lower()
            if not any(m in b_l for m in ["backend", "database architecture", "database setup", "server logic", "api integration"]):
                clean_breakdown.append(b)

        if len(clean_breakdown) < 2:
            clean_breakdown = [
                BreakdownItem(label="UI/UX & Component Architecture", percentage=35, explanation="Modular reusable UI components & layout structure"),
                BreakdownItem(label="Client Logic & Interactive State", percentage=30, explanation="Client-side routing, form validation, and reactive state"),
                BreakdownItem(label="Responsive Styling & Design Polish", percentage=20, explanation="Mobile responsiveness, typography, and micro-interactions"),
                BreakdownItem(label="Cross-Browser QA & Deployment", percentage=15, explanation="Cross-browser viewport testing and CDN hosting setup"),
            ]
        else:
            tot = sum(b.percentage for b in clean_breakdown) or 100
            clean_breakdown = [b.model_copy(update={"percentage": round((b.percentage / tot) * 100)}) for b in clean_breakdown]

        return analysis.model_copy(update={
            "work_scope": updated_scope,
            "project_category": category,
            "technology": clean_tech,
            "features": FeatureBuckets(mvp=clean_mvp, advanced=clean_adv, optional=clean_opt),
            "custom_breakdown": clean_breakdown,
        })

    elif scope_type == "backend_only":
        # 1. Scope booleans: STRICTLY backend, no frontend
        updated_scope = current_scope.model_copy(update={
            "frontend": False,
            "backend": True,
            "database": True,
            "api_integration": True,
            "ai_integration": False,
            "bug_fixing": False,
            "feature_addition": True,
            "testing": True,
            "deployment": True,
        })
        category = "Backend API Service"

        # 2. Technology: remove frontend/UI items
        clean_tech = []
        frontend_markers = {"frontend", "ui", "styling", "css", "html", "react", "vue", "tailwind", "next.js ui", "design"}
        for t in analysis.technology:
            layer_l = t.layer.lower()
            rec_l = t.recommendation.lower()
            if not any(m in layer_l or m in rec_l for m in frontend_markers):
                clean_tech.append(t)

        if not clean_tech:
            clean_tech = [
                TechnologyRecommendation(layer="Backend Framework", recommendation="FastAPI / Node.js", reason="High-performance asynchronous API service"),
                TechnologyRecommendation(layer="Database", recommendation="PostgreSQL / MongoDB", reason="Robust data persistence with indexing and schema validation"),
                TechnologyRecommendation(layer="Deployment", recommendation="Docker / Cloud PaaS", reason="Containerized server deployment with automated health checks"),
            ]

        # 3. Features: strip frontend UI features
        def is_backend_feature(f: FeatureEstimate) -> bool:
            name_l = f.name.lower()
            desc_l = f.description.lower()
            return not any(m in name_l or m in desc_l for m in ["ui screen", "landing page", "page layout", "styling", "css theme", "navbar", "hero section"])

        clean_mvp = [f for f in analysis.features.mvp if is_backend_feature(f)]
        if not clean_mvp:
            clean_mvp = [
                FeatureEstimate(name="RESTful API Endpoints", description="Structured API routes with request validation and JSON responses", complexity="Simple", estimated_hours=6),
                FeatureEstimate(name="Database Schema & Models", description="Entity definitions, indexes, and automated migrations", complexity="Simple", estimated_hours=5),
            ]
        clean_adv = [f for f in analysis.features.advanced if is_backend_feature(f)]
        clean_opt = [f for f in analysis.features.optional if is_backend_feature(f)]

        # 4. Breakdown: strictly backend tasks
        clean_breakdown = []
        for b in (analysis.custom_breakdown or []):
            b_l = b.label.lower()
            if not any(m in b_l for m in ["frontend", "ui design", "ui components", "styling", "css"]):
                clean_breakdown.append(b)

        if len(clean_breakdown) < 2:
            clean_breakdown = [
                BreakdownItem(label="RESTful API Endpoints & Routing", percentage=35, explanation="Core business logic and controller endpoints"),
                BreakdownItem(label="Database Schema & ORM Models", percentage=25, explanation="Entity models, indexing, and migration pipelines"),
                BreakdownItem(label="Authentication & Security Middleware", percentage=25, explanation="JWT auth, input validation, and rate limiting"),
                BreakdownItem(label="API Testing & Server Deployment", percentage=15, explanation="Integration tests and container deployment"),
            ]
        else:
            tot = sum(b.percentage for b in clean_breakdown) or 100
            clean_breakdown = [b.model_copy(update={"percentage": round((b.percentage / tot) * 100)}) for b in clean_breakdown]

        return analysis.model_copy(update={
            "work_scope": updated_scope,
            "project_category": category,
            "technology": clean_tech,
            "features": FeatureBuckets(mvp=clean_mvp, advanced=clean_adv, optional=clean_opt),
            "custom_breakdown": clean_breakdown,
        })

    elif scope_type == "payment_integration":
        updated_scope = current_scope.model_copy(update={
            "frontend": True,
            "backend": True,
            "database": True,
            "api_integration": True,
            "ai_integration": False,
            "bug_fixing": False,
            "feature_addition": True,
            "testing": True,
            "deployment": True,
        })
        category = "Payment Gateway Integration"

        custom_breakdown = [
            BreakdownItem(label="Payment Gateway SDK & Checkout Trigger", percentage=25, explanation="Frontend checkout triggers and gateway modal binding"),
            BreakdownItem(label="Backend Order Creation & Verification API", percentage=30, explanation="Order ID creation and cryptographic signature verification"),
            BreakdownItem(label="Webhook Handler & Security Validation", percentage=20, explanation="Asynchronous payment state handling and webhook verification"),
            BreakdownItem(label="Transaction Logging & Database Schema", percentage=15, explanation="Database order and payment audit logs"),
            BreakdownItem(label="Sandbox Testing & QA Verification", percentage=10, explanation="Testing payment success, failure, and refunds in sandbox"),
        ]

        clean_tech = [
            TechnologyRecommendation(layer="Payment Gateway", recommendation="Razorpay / Stripe SDK", reason="Industry-standard payment processing with robust webhooks"),
            TechnologyRecommendation(layer="Backend API", recommendation="FastAPI / Express API", reason="Secure server-side order generation and signature verification"),
            TechnologyRecommendation(layer="Database", recommendation="Existing Database Schema", reason="Transaction logging and order state updates"),
        ]

        return analysis.model_copy(update={
            "work_scope": updated_scope,
            "project_category": category,
            "technology": clean_tech,
            "custom_breakdown": custom_breakdown,
        })

    # For general projects, normalize custom_breakdown percentages
    if analysis.custom_breakdown and len(analysis.custom_breakdown) >= 2:
        tot = sum(b.percentage for b in analysis.custom_breakdown) or 100
        normalized = [b.model_copy(update={"percentage": round((b.percentage / tot) * 100)}) for b in analysis.custom_breakdown]
        return analysis.model_copy(update={"custom_breakdown": normalized})

    return analysis


def _apply_india_market_pricing(payload: EstimateInput, analysis: AIAnalysis, market_snapshot: dict | None = None) -> AIAnalysis:
    """Price the AI-derived scope with transparent, domestic India rate bands.

    Uses the latest validated market snapshot from MongoDB when available;
    falls back to the hard-coded INDIA_RATE_BANDS (= SEED_BANDS) otherwise.
    """
    snapshot_rates = None
    source_info = None
    if market_snapshot and market_snapshot.get("rates"):
        rates_dict = market_snapshot["rates"]
        buyer_key = payload.buyerType
        if buyer_key in rates_dict:
            raw = rates_dict[buyer_key]
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
    scope_type = _detect_scope_type(payload)

    # Scale hours strictly according to the scope requested
    if scope_type == "frontend_only":
        if analysis.complexity.level == "Simple":
            hours = min(max(hours, 6), 14)
        elif analysis.complexity.level == "Medium":
            hours = min(max(hours, 12), 30)
        else:
            hours = min(max(hours, 25), 55)
    elif scope_type == "backend_only":
        if analysis.complexity.level == "Simple":
            hours = min(max(hours, 8), 18)
        elif analysis.complexity.level == "Medium":
            hours = min(max(hours, 16), 38)
        else:
            hours = min(max(hours, 30), 75)
    elif scope_type == "payment_integration":
        hours = min(max(hours, 10), 22)
    elif scope_type == "ai_integration":
        hours = min(max(hours, 12), 26)
    elif scope_type == "bug_fixing":
        hours = min(max(hours, 6), 20)
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
            pass

    system_prompt = (
        "You are a senior software architect and project cost estimator for the Indian market. "
        "Understand English, Hindi, Hinglish, and mixed-language requirements.\n\n"
        "CRITICAL DIRECTIVE: ESTIMATE STRICTLY ACCORDING TO THE USER'S DESCRIPTION AND INPUT.\n"
        "Every single outcome (work_scope, custom_breakdown, technology recommendations, detected features, project_category, hours, and pricing) "
        "must faithfully and strictly match what the user actually asked for:\n\n"
        "1. ONLY FRONTEND:\n"
        "   - If the user asks for 'only frontend', 'frontend only', 'just frontend', 'ui only', 'react frontend', 'html css', "
        "     'figma to html', 'landing page', 'portfolio', 'no backend', or client-side only:\n"
        "   - Set work_scope.frontend = true. All backend and database fields MUST be false (work_scope.backend = false, work_scope.database = false, work_scope.api_integration = false).\n"
        "   - project_category MUST be 'Frontend Application' or 'Portfolio / Landing Page'.\n"
        "   - custom_breakdown MUST ONLY contain frontend tasks (e.g. UI/UX & Component Architecture, Client Logic & State, Responsive Styling & Animations, Browser QA & Deployment). NEVER mention backend or database!\n"
        "   - technology MUST ONLY list frontend/client-side technologies (e.g. React/Next.js, Tailwind, Vite, Vercel). NEVER recommend Node/Python/Express or PostgreSQL/MongoDB!\n"
        "   - features (mvp, advanced, optional) MUST ONLY list frontend features (UI components, pages, responsive design, animations). NEVER list backend APIs or database schemas!\n\n"
        "2. ONLY BACKEND:\n"
        "   - If the user asks for 'only backend', 'backend only', 'just backend', 'api only', 'only api', 'rest api', 'graphql api', "
        "     'fastapi backend', 'node backend', 'express', 'django', 'no frontend', 'without frontend', 'backend service':\n"
        "   - Set work_scope.backend = true, work_scope.database = true, work_scope.api_integration = true, work_scope.testing = true, work_scope.deployment = true.\n"
        "   - work_scope.frontend MUST BE FALSE!\n"
        "   - project_category MUST be 'Backend API Service' or 'Backend System'.\n"
        "   - custom_breakdown MUST ONLY contain backend tasks (e.g. RESTful API Endpoints & Routing, Database Schema & ORM Models, Authentication & Security Middleware, API Testing & Server Deployment). NEVER mention frontend or UI!\n"
        "   - technology MUST ONLY list backend, database, API, and server technologies (e.g. FastAPI/Node.js, PostgreSQL/MongoDB, Redis, Docker). NEVER recommend frontend UI frameworks like React/Vue/Tailwind!\n"
        "   - features (mvp, advanced, optional) MUST ONLY list backend/API features (endpoints, auth, database, validation, queue). NEVER list UI screens or page layouts!\n\n"
        "3. SPECIFIC FEATURE / INTEGRATION (e.g. Payment Gateway into existing website, AI Chatbot into existing project, Auth integration):\n"
        "   - If the user asks to integrate a specific feature into an existing website/app:\n"
        "   - DO NOT estimate building a whole website from scratch!\n"
        "   - custom_breakdown MUST ONLY contain the specific tasks for that integration (e.g. for Payment Gateway: 'Payment Gateway SDK & Checkout Trigger', 'Backend Order Creation & Verification API', 'Webhook Handler & Security Validation', 'Transaction Logging & Database Schema', 'Sandbox Testing & QA Verification').\n"
        "   - project_category MUST reflect the integration (e.g. 'Payment Gateway Integration', 'AI Feature Integration').\n"
        "   - Keep estimated hours and cost focused strictly on that integration (typically 10–25 hours).\n\n"
        "4. FULL STACK (BOTH FRONTEND AND BACKEND):\n"
        "   - ONLY when the user explicitly asks for full stack, both frontend & backend, or a complete platform from scratch (e.g. 'Full stack e-commerce with frontend store and admin dashboard') should you include both frontend and backend in scope, breakdown, and stack.\n\n"
        "5. custom_breakdown REQUIREMENTS:\n"
        "   - Provide 3 to 6 items that accurately split the total project work.\n"
        "   - Each item has 'label' (clear task name) and 'percentage' (integer representing share of cost, e.g. 35).\n"
        "   - The percentages MUST sum to exactly 100.\n\n"
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

        # Enforce deterministic scope consistency
        analysis = _enforce_scope_intent(payload, analysis)

        # Apply realistic market pricing and timeline
        return _apply_india_market_pricing(payload, analysis, market_snapshot)
    except Exception as exc:
        raise RuntimeError(f"The AI provider returned an invalid or unavailable response: {exc}") from exc

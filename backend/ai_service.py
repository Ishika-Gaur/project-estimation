import json
import os

import httpx

from models import AIAnalysis, EstimateInput


GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models"


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
    },
    "required": [
        "project_category", "summary", "requirements", "missing_or_unclear", "features",
        "technology", "complexity", "timeline", "pricing", "market_analysis", "suggestions",
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


def _prompt(payload: EstimateInput) -> str:
    return json.dumps({
        "title": payload.projectName,
        "for": payload.buyerType,
        "users": payload.audience,
        "platforms": payload.platforms,
        "description": payload.description,
        "selected_technologies_and_features": payload.features,
    }, ensure_ascii=False)


async def analyze_project(payload: EstimateInput) -> AIAnalysis:
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("AI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured on the backend.")

    system_prompt = (
        "You are a senior software architect and India-focused project estimator. "
        "Understand English, Hindi, Hinglish, and mixed-language requirements. Extract intent "
        "without translating away important details. Recommend technologies based on requirements, "
        "not merely the user's selected tags. Return realistic INR estimates using approximate "
        "professional development rates, clearly label market analysis as knowledge-based rather "
        "than live research, and never claim current web access. Keep hours, days, weeks, and prices "
        "internally consistent. Complexity must be Simple, Medium, Complex, or Enterprise."
    )
    model = os.getenv("AI_MODEL", "gemini-3.7-flash")
    body = {
        "systemInstruction": {"parts": [{"text": system_prompt}]},
        "contents": [{"role": "user", "parts": [{"text": _prompt(payload)}]}],
        "generationConfig": {
            "temperature": 0.2,
            "responseMimeType": "application/json",
        },
    }
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            response = await client.post(
                f"{GEMINI_API_URL}/{model}:generateContent",
                params={"key": api_key},
                headers={"Content-Type": "application/json"},
                json=body,
            )
        response.raise_for_status()
        content = response.json()["candidates"][0]["content"]["parts"][0]["text"]
        return AIAnalysis.model_validate(json.loads(content))
    except (httpx.HTTPError, KeyError, IndexError, ValueError, TypeError) as exc:
        raise RuntimeError("The AI provider returned an invalid or unavailable response.") from exc
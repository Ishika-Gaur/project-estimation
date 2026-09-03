import re
import time
import random
import math
from datetime import datetime, timezone

TYPE_BASE = {
    "Website": 18000,
    "Web Application": 32000,
    "Mobile Application": 38000,
    "E-commerce": 40000,
    "SaaS": 48000,
    "AI Application": 52000,
    "Other": 28000,
}

SCALE_MULTIPLIER = {
    "Less than 100": 1,
    "100–1,000": 1.1,
    "1,000–10,000": 1.25,
    "10,000+": 1.45,
}

FEATURE_WEIGHT = {
    "Authentication": 6000,
    "Admin Dashboard": 9000,
    "Payment Gateway": 9000,
    "Search": 4000,
    "Notifications": 4500,
    "Real-time Chat": 12000,
    "File Upload": 4000,
    "Maps": 6000,
    "AI Integration": 14000,
    "Analytics": 7000,
    "Third-party APIs": 6000,
}

KEYWORD_FEATURES = [
    (re.compile(r"\b(login|sign ?up|account|auth)", re.I), "Authentication"),
    (re.compile(r"\b(product|catalog|inventory|listing)", re.I), "Product Management"),
    (re.compile(r"\b(cart|checkout|basket)", re.I), "Shopping Cart"),
    (re.compile(r"\b(pay|payment|razorpay|stripe|billing|subscription)", re.I), "Payment Integration"),
    (re.compile(r"\b(admin|dashboard|panel)", re.I), "Admin Dashboard"),
    (re.compile(r"\b(chat|message|messaging)", re.I), "Real-time Chat"),
    (re.compile(r"\b(track|order|shipping|delivery)", re.I), "Order Tracking"),
    (re.compile(r"\b(search|filter)", re.I), "Search & Filters"),
    (re.compile(r"\b(upload|image|file|document)", re.I), "File Upload"),
    (re.compile(r"\b(notification|email|sms|alert)", re.I), "Notifications"),
    (re.compile(r"\b(ai|ml|gpt|recommend|chatbot)", re.I), "AI Integration"),
    (re.compile(r"\b(map|location|geo)", re.I), "Maps & Location"),
    (re.compile(r"\b(report|analytic|insight)", re.I), "Analytics"),
]


def js_round(value: float) -> int:
    return math.floor(value + 0.5) if value >= 0 else math.ceil(value - 0.5)


def round_500(value: float) -> int:
    return js_round(value / 500) * 500


def stack_for(input_data: dict, features: list) -> list:
    all_items = " ".join(list(features) + [input_data.get("description") or ""]).lower()
    platforms = input_data.get("platforms", [])
    project_type = input_data.get("projectType", "")

    frontend = "Next.js / React"
    if "flutter" in all_items:
        frontend = "Flutter"
    elif "react native" in all_items:
        frontend = "React Native"
    elif "vue" in all_items:
        frontend = "Vue.js / Nuxt"
    elif "Android" in platforms or "iOS" in platforms or project_type == "Mobile Application":
        frontend = "React Native / Next.js"

    backend = "Node.js / Express"
    if "fastapi" in all_items or "python" in all_items or project_type == "AI Application":
        backend = "Python / FastAPI"
    elif "django" in all_items:
        backend = "Python / Django"
    elif "go" in all_items or "golang" in all_items:
        backend = "Golang"
    elif "nest" in all_items:
        backend = "NestJS"

    database = "PostgreSQL"
    if "mongo" in all_items:
        database = "MongoDB"
    elif "supabase" in all_items:
        database = "Supabase (Postgres)"
    elif "firebase" in all_items:
        database = "Firebase Firestore"
    elif "redis" in all_items:
        database = "PostgreSQL + Redis"
    elif project_type == "E-commerce":
        database = "PostgreSQL"

    other = []
    if re.search(r"payment|stripe|razorpay", all_items):
        other.append("Payment API")
    if re.search(r"upload|file|s3|storage", all_items):
        other.append("Cloud Storage")
    if re.search(r"ai|llm|gpt|claude|agent", all_items):
        other.append("LLM API")
    if re.search(r"aws", all_items):
        other.append("AWS Cloud")
    if re.search(r"docker", all_items):
        other.append("Docker")
    if not other:
        other.append("Cloud Hosting (Vercel / Cloud)")

    return [
        {"layer": "Frontend", "value": frontend},
        {"layer": "Backend", "value": backend},
        {"layer": "Database", "value": database},
        {"layer": "Services", "value": " · ".join(other[:2])},
    ]


def generate_estimate(input_data: dict) -> dict:
    description = input_data.get("description") or ""
    features = input_data.get("features") or []
    platforms = input_data.get("platforms") or ["Web"]
    users = input_data.get("users") or "1,000–10,000"
    project_type = input_data.get("projectType") or "Web Application"

    detected = set()
    for pattern, name in KEYWORD_FEATURES:
        if pattern.search(description):
            detected.add(name)
    for f in features:
        detected.add(f)
    if not detected:
        detected.add("Core Application Screens")

    feature_cost = sum(FEATURE_WEIGHT.get(f, 4000) for f in features)
    platform_cost = max(0, len(platforms) - 1) * 15000
    description_bonus = min(12000, (len(description) // 40) * 800)

    base = (
        (TYPE_BASE.get(project_type, 28000) + feature_cost + platform_cost + description_bonus)
        * SCALE_MULTIPLIER.get(users, 1.1)
    )

    cost_min = round_500(base * 0.85)
    cost_max = round_500(base * 1.25)

    effort = cost_max
    complexity = "High" if effort > 140000 else "Medium" if effort > 60000 else "Low"

    weeks_min = max(2, js_round(cost_min / 14000))
    weeks_max = max(weeks_min + 1, js_round(cost_max / 11000))

    norm_input = {
        **input_data,
        "description": description,
        "features": features,
        "platforms": platforms,
        "users": users,
        "projectType": project_type,
    }

    shares = [
        ("Frontend Development", 0.32),
        ("Backend Development", 0.28),
        ("Database", 0.12),
        ("API Integrations", 0.17),
        ("Testing & Deployment", 0.11),
    ]
    breakdown = [
        {"label": label, "min": round_500(cost_min * share), "max": round_500(cost_max * share)}
        for label, share in shares
    ]

    feature_list = list(detected)
    headline = ", ".join(feature_list[:4]).lower()
    analysis = (
        f"Based on the provided requirements, this is a {complexity.lower()}-complexity "
        f"{project_type.lower()} project targeting {', '.join(platforms) or 'web'} "
        f"with an expected audience of {users.lower()} users. The major development effort "
        f"comes from {headline or 'the core application screens'}. "
    )
    if complexity == "High":
        analysis += "Scale requirements and multiple integrations push both the timeline and the QA effort upward, so a phased release is recommended."
    elif complexity == "Medium":
        analysis += "Integration work and admin functionality account for the largest share of the budget, while the remaining scope is standard product build-out."
    else:
        analysis += "The scope is contained and can be delivered by a small team with a straightforward stack."

    return {
        "id": f"est_{int(time.time()*1000):x}{random.randint(1000,9999):x}",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "input": norm_input,
        "costMin": cost_min,
        "costMax": cost_max,
        "weeksMin": weeks_min,
        "weeksMax": weeks_max,
        "complexity": complexity,
        "breakdown": breakdown,
        "detectedFeatures": feature_list,
        "stack": stack_for(norm_input, feature_list),
        "analysis": analysis,
    }
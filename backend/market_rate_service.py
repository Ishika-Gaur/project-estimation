"""Versioned India development-rate snapshots and weekly source collection."""
import asyncio
import re
import uuid
from datetime import datetime, timedelta, timezone

import httpx


METHODOLOGY_VERSION = "india-market-v1"
UPDATE_INTERVAL = timedelta(days=7)
MIN_RATE, MAX_RATE = 200, 10_000

# Only used before the first validated database snapshot exists. Subsequent
# pricing always comes from MongoDB, so source changes require no code edit.
SEED_BANDS = {
    "freelancer": (600, 1200, 2200),
    "startup": (900, 1600, 2600),
    "small-business": (1200, 2000, 3200),
    "agency-enterprise": (1600, 2800, 4500),
}

SOURCES = (
    {
        "name": "Freelance Rate India",
        "url": "https://freelancerateindia.com/",
        "pattern": r"Web Developer[^₹]{0,300}?₹([\d,]+)[^₹]{0,80}?₹([\d,]+)",
        "notes": "Public domestic web-developer benchmark.",
    },
    {
        "name": "ITSolvez India rate guide",
        "url": "https://itsolvez.com/blog/software-development-hourly-rates-india",
        "pattern": r"₹([\d,]+)\s*[–-]\s*₹([\d,]+)\s*(?:per )?hour",
        "notes": "Public India software-delivery benchmark.",
    },
    {
        "name": "Glassdoor India Software Developer",
        "url": "https://www.glassdoor.co.in/Salaries/india-software-developer-salary-SRCH_IL.0,5_IN115_KO6,24.htm",
        "pattern": r"₹([\d,]+)\s*[–—-]\s*₹([\d,]+)\s*/(?:hr|hour)",
        "notes": "Glassdoor India hourly rate range for software developers.",
    },
    {
        "name": "AmbitionBox Developer Salaries",
        "url": "https://www.ambitionbox.com/salaries/software-developer-salary",
        "pattern": r"₹([\d,]+)\s*[–—-]\s*₹([\d,]+)\s*(?:per )?(?:hr|hour)",
        "notes": "AmbitionBox crowd-sourced Indian developer rate data.",
    },
    {
        "name": "PayScale India Software Developer",
        "url": "https://www.payscale.com/research/IN/Job=Software_Developer/Salary",
        "pattern": r"₹([\d,]+)\s*[–—-]\s*₹([\d,]+)\s*(?:per )?(?:hr|hour)",
        "notes": "PayScale India hourly rate range.",
    },
)


def _now():
    return datetime.now(timezone.utc)


def _clean_html(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value)).replace("&nbsp;", " ")


def _valid_range(low: int, high: int) -> bool:
    return MIN_RATE <= low <= high <= MAX_RATE


def _derive_bands(ranges: list[tuple[int, int]]) -> dict:
    """Median-like range aggregation, then engagement overhead mapping.

    Each source contributes its published INR/hour range. The representative
    low/high are medians, avoiding one unusually low or high source. Buyer
    bands are deterministic multipliers of that representative range.
    """
    lows, highs = sorted(item[0] for item in ranges), sorted(item[1] for item in ranges)
    low, high = lows[len(lows) // 2], highs[len(highs) // 2]
    typical = round((low + high) / 2)
    multipliers = {
        "freelancer": (0.85, 1.0, 1.15),
        "startup": (1.0, 1.2, 1.45),
        "small-business": (1.15, 1.45, 1.8),
        "agency-enterprise": (1.4, 1.8, 2.4),
    }
    return {
        buyer: tuple(round(typical * multiplier / 50) * 50 for multiplier in values)
        for buyer, values in multipliers.items()
    }


async def collect_sources() -> list[dict]:
    """Collect only publicly exposed INR/hour ranges; failures are skipped."""
    collected = []
    async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers={"User-Agent": "CostifyAI-market-rates/1.0"}) as client:
        for source in SOURCES:
            try:
                response = await client.get(source["url"])
                response.raise_for_status()
                match = re.search(source["pattern"], _clean_html(response.text), re.IGNORECASE)
                if not match:
                    continue
                low, high = (int(value.replace(",", "")) for value in match.groups())
                if _valid_range(low, high):
                    collected.append({
                        **source,
                        "minimum_rate": low,
                        "maximum_rate": high,
                        "currency": "INR",
                        "hourly": True,
                        "collected_at": _now(),
                    })
            except (httpx.HTTPError, ValueError, TypeError):
                continue
    return collected


async def get_active_snapshot(db) -> dict:
    snapshot = await db.market_rates.find_one({"status": "active"}, {"_id": 0})
    if snapshot:
        return snapshot
    return {
        "id": "seed-india-market-rates",
        "status": "seed",
        "rates": SEED_BANDS,
        "currency": "INR",
        "country": "India",
        "sources": [],
        "collected_at": None,
        "methodology_version": METHODOLOGY_VERSION,
        "source_count": 0,
        "note": "Awaiting the first validated market-rate update.",
    }


async def update_market_rates(db) -> dict:
    """Activate a new snapshot only after two valid public sources succeed."""
    sources = await collect_sources()
    if len(sources) < 2:
        await db.market_rate_updates.insert_one({
            "id": f"rate_update_{uuid.uuid4().hex}", "status": "failed",
            "reason": "Fewer than two validated INR/hour sources were available.",
            "source_count": len(sources), "created_at": _now(),
        })
        return {"updated": False, "source_count": len(sources)}

    rates = _derive_bands([(item["minimum_rate"], item["maximum_rate"]) for item in sources])
    now = _now()
    snapshot = {
        "id": f"market_rates_{uuid.uuid4().hex}", "status": "active", "rates": rates,
        "currency": "INR", "country": "India", "sources": sources,
        "collected_at": now, "effective_from": now,
        "methodology_version": METHODOLOGY_VERSION, "source_count": len(sources),
    }
    await db.market_rates.update_many({"status": "active"}, {"$set": {"status": "superseded", "superseded_at": now}})
    await db.market_rates.insert_one(snapshot)
    return {"updated": True, "source_count": len(sources), "snapshot": snapshot}


async def weekly_rate_updater(db):
    while True:
        try:
            active = await get_active_snapshot(db)
            updated_at = active.get("collected_at")

            if updated_at and updated_at.tzinfo is None:
                    updated_at = updated_at.replace(tzinfo=timezone.utc)

            if not updated_at or _now() - updated_at >= UPDATE_INTERVAL:
             await update_market_rates(db)
        except Exception as exc:
            print(f"[CostifyAI] Market-rate update failed: {exc}")
        await asyncio.sleep(24 * 60 * 60)


async def get_update_status(db) -> dict:
    """Return a summary of the latest market-rate update status for admin/debug."""
    active = await get_active_snapshot(db)
    last_failure = await db.market_rate_updates.find_one(
        {"status": "failed"}, {"_id": 0}, sort=[("created_at", -1)]
    )
    return {
        "current_snapshot_id": active.get("id"),
        "status": active.get("status", "seed"),
        "source_count": active.get("source_count", 0),
        "collected_at": active.get("collected_at"),
        "methodology_version": active.get("methodology_version"),
        "rates": active.get("rates", SEED_BANDS),
        "last_failure": {
            "reason": last_failure.get("reason"),
            "created_at": last_failure.get("created_at"),
        } if last_failure else None,
    }

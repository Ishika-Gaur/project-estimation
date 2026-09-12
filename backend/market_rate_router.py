from fastapi import APIRouter, Depends, Request

from auth import require_admin
from market_rate_service import get_active_snapshot, update_market_rates, get_update_status

router = APIRouter(prefix="/api/market-rates", tags=["market-rates"])


@router.get("")
async def current_rates(request: Request):
    return await get_active_snapshot(request.app.state.db)


@router.get("/status")
async def rate_status(request: Request):
    """Public endpoint returning current rate update metadata (no sensitive data)."""
    return await get_update_status(request.app.state.db)


@router.get("/history")
async def rate_history(request: Request, _admin=Depends(require_admin)):
    return await request.app.state.db.market_rates.find({}, {"_id": 0}).sort("effective_from", -1).to_list(20)


@router.post("/update")
async def refresh_rates(request: Request, _admin=Depends(require_admin)):
    return await update_market_rates(request.app.state.db)


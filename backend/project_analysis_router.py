import time
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Request

from project_analysis_service import analyze_project, generate_task_plan
from models import ProjectAnalysisInput, TaskPlanInput
from auth import get_optional_user


router = APIRouter(prefix="/api/project-analysis", tags=["project-analysis"])


@router.post("/analyze")
async def create_analysis(payload: ProjectAnalysisInput, request: Request, user=Depends(get_optional_user)):
    """Analyze a project based on description, GitHub URL, and/or deployed URL"""
    try:
        analysis = await analyze_project(payload)
        
        # Save analysis to database
        analysis_doc = {
            "id": f"analysis_{int(time.time() * 1000):x}{uuid.uuid4().hex[:6]}",
            "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "created_at": datetime.now(timezone.utc),
            "user_email": user.get("email") if user else None,
            "input": payload.model_dump(),
            "result": analysis.model_dump(),
        }
        
        try:
            await request.app.state.db.project_analyses.insert_one(analysis_doc.copy())
        except Exception:
            pass  # Continue even if DB save fails
        
        return analysis
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Analysis failed") from exc


@router.post("/task-plan")
async def create_task_plan(payload: TaskPlanInput):
    """Generate a task plan based on project analysis"""
    try:
        if payload.work_type not in ["solo", "team"]:
            raise HTTPException(status_code=400, detail="work_type must be 'solo' or 'team'")
        
        if payload.work_type == "team" and not payload.team_members:
            raise HTTPException(status_code=400, detail="team_members required for team work type")
        
        task_plan = await generate_task_plan(
            payload.analysis, payload.work_type, payload.team_members
        )
        return task_plan
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Task plan generation failed") from exc


@router.get("/analyses")
async def list_analyses(request: Request, user=Depends(get_optional_user)):
    """List project analyses for the current user"""
    try:
        query = {}
        if user:
            query["user_email"] = user.get("email")
        
        analyses = await request.app.state.db.project_analyses.find(
            query, {"_id": 0}
        ).sort("createdAt", -1).to_list(20)
        
        for analysis in analyses:
            analysis.pop("created_at", None)
        
        return analyses
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Analysis history unavailable") from exc


@router.get("/analyses/{analysis_id}")
async def get_analysis(analysis_id: str, request: Request):
    """Get a specific project analysis by ID"""
    try:
        analysis = await request.app.state.db.project_analyses.find_one(
            {"id": analysis_id}, {"_id": 0}
        )
        if not analysis:
            raise HTTPException(status_code=404, detail="Analysis not found")
        
        analysis.pop("created_at", None)
        return analysis
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Failed to retrieve analysis") from exc

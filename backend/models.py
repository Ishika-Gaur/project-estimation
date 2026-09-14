from pydantic import BaseModel, EmailStr
from typing import List, Literal, Optional


class EstimateInput(BaseModel):
    projectName: Optional[str] = None
    projectType: str = "Web Application"
    description: Optional[str] = ""
    github_url: Optional[str] = ""
    deployed_url: Optional[str] = ""
    features: List[str] = []
    users: str = "1,000–10,000"
    platforms: List[str] = ["Web"]
    buyerType: str = "freelancer"
    audience: str = "internal"


class FeatureEstimate(BaseModel):
    name: str
    description: str
    complexity: str
    estimated_hours: int


class TechnologyRecommendation(BaseModel):
    layer: str
    recommendation: str
    reason: str


class Suggestion(BaseModel):
    title: str
    description: str
    reason: str
    complexity: str
    additional_cost: str
    additional_time: str


class FeatureBuckets(BaseModel):
    mvp: List[FeatureEstimate]
    advanced: List[FeatureEstimate]
    optional: List[FeatureEstimate]


class ComplexityAnalysis(BaseModel):
    level: str
    score: int
    reason: str


class TimelineEstimate(BaseModel):
    hours: int
    days: int
    weeks: float
    mvp: str


class PricingEstimate(BaseModel):
    budget: int
    typical: int
    premium: int
    mvp: int
    currency: str
    explanation: str


class MarketAnalysis(BaseModel):
    demand: str
    trends: List[str]
    notes: str


class WorkScope(BaseModel):
    frontend: bool = True
    backend: bool = True
    database: bool = True
    api_integration: bool = True
    ai_integration: bool = False
    bug_fixing: bool = False
    feature_addition: bool = False
    testing: bool = True
    deployment: bool = True


class BreakdownItem(BaseModel):
    label: str
    percentage: int
    explanation: Optional[str] = ""


class AIAnalysis(BaseModel):
    project_category: str
    summary: str
    requirements: List[str]
    missing_or_unclear: List[str]
    work_scope: Optional[WorkScope] = None
    custom_breakdown: Optional[List[BreakdownItem]] = None
    features: FeatureBuckets
    technology: List[TechnologyRecommendation]
    complexity: ComplexityAnalysis
    timeline: TimelineEstimate
    pricing: PricingEstimate
    market_analysis: MarketAnalysis
    suggestions: List[Suggestion]


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    refresh_token: str = None
    token_type: str = "bearer"
    role: str = "user"


class AdminRoleUpdate(BaseModel):
    role: Literal["user", "admin"]


class AdminPage(BaseModel):
    items: List[dict]
    page: int
    page_size: int
    total: int
    pages: int


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class RefreshToken(BaseModel):
    refresh_token: str


# Project Analysis Models
class ProjectAnalysisInput(BaseModel):
    description: Optional[str] = ""
    github_url: Optional[str] = ""
    deployed_url: Optional[str] = ""


class Task(BaseModel):
    name: str
    description: str
    priority: str  # high, medium, low
    estimated_hours: int
    dependencies: List[str] = []
    recommended_order: int


class ModuleStatus(BaseModel):
    name: str
    completion_percentage: int
    status: str  # completed, in_progress, not_started


class TeamMember(BaseModel):
    name: str
    role: str
    skills: List[str]


class TaskAssignment(BaseModel):
    member_name: str
    tasks: List[Task]
    total_hours: int


class ProjectAnalysisResult(BaseModel):
    overall_completion: int
    modules: List[ModuleStatus]
    completed_features: List[str]
    in_progress_features: List[str]
    remaining_features: List[str]
    recommended_next_steps: List[str]
    estimated_remaining_hours: int
    project_type: str
    analysis_source: str  # description, github, deployed, combined
    evidence_notes: List[str]


class TaskPlanInput(BaseModel):
    analysis: ProjectAnalysisResult
    work_type: str = "solo"
    team_members: Optional[List[TeamMember]] = None

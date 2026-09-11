from pydantic import BaseModel, EmailStr
from typing import List, Literal, Optional


class EstimateInput(BaseModel):
    projectName: Optional[str] = None
    projectType: str = "Web Application"
    description: Optional[str] = ""
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


class AIAnalysis(BaseModel):
    project_category: str
    summary: str
    requirements: List[str]
    missing_or_unclear: List[str]
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
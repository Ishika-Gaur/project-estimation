import re
from pydantic import BaseModel, EmailStr, field_validator
from typing import Any, List, Literal, Optional, Union

MAX_USERS = 100_000


def _validate_users(v: Any) -> str:
    # 1. Reject booleans (must check before int since bool is a subclass of int in Python)
    if isinstance(v, bool):
        raise ValueError("Users count cannot be a boolean.")

    # 2. Reject floating point / decimals
    if isinstance(v, float):
        raise ValueError("Users count cannot be a decimal number.")

    # 3. Numeric integer input
    if isinstance(v, int):
        if v < 0:
            raise ValueError("Users count cannot be negative.")
        if v > MAX_USERS:
            raise ValueError(f"Users count exceeds maximum allowed limit of {MAX_USERS:,}.")
        return str(v)

    if not isinstance(v, str):
        raise ValueError("Users count must be a string or integer.")

    s = v.strip()
    if not s:
        raise ValueError("Users count cannot be empty.")

    # Reject boolean string representations
    if s.lower() in ("true", "false"):
        raise ValueError("Users count cannot be a boolean.")

    # Reject decimal point in string
    if "." in s:
        raise ValueError("Users count cannot be a decimal number.")

    # Reject multiple or malformed signs
    if any(bad in s for bad in ["++", "--", "+-", "-+"]):
        raise ValueError("Invalid numeric format for users count.")

    # Reject negative strings (e.g. "-5", "-100", "- 5")
    if s.startswith("-") or re.match(r"^-\s*\d+", s):
        raise ValueError("Users count cannot be negative.")

    # Reject scientific notation, hex, octal, binary, NaN, Infinity
    if re.search(r"\b(?:nan|infinity|inf)\b", s, re.IGNORECASE):
        raise ValueError("Invalid users count.")
    if re.search(r"0[xob][0-9a-fA-F]+", s):
        raise ValueError("Invalid numeric format for users count.")
    if re.search(r"\d+e[+-]?\d+", s, re.IGNORECASE):
        raise ValueError("Scientific notation is not allowed for users count.")

    # Check for malformed commas like ",," or trailing/leading comma
    if ",," in s or s.startswith(",") or s.endswith(","):
        raise ValueError("Invalid numeric format for users count.")

    # Case A: "Less than X" or "< X"
    m_less = re.match(r"^(?:less\s+than|<)\s*(\d{1,3}(?:,\d{3})*|\d+)$", s, re.IGNORECASE)
    if m_less:
        num = int(m_less.group(1).replace(",", ""))
        if num < 0:
            raise ValueError("Users count cannot be negative.")
        if num > MAX_USERS:
            raise ValueError(f"Users count exceeds maximum allowed limit of {MAX_USERS:,}.")
        return s

    # Case B: "X+" or "> X" or "More than X"
    m_plus = re.match(r"^(\d{1,3}(?:,\d{3})*|\d+)\s*\+$", s)
    if not m_plus:
        m_plus = re.match(r"^(?:>|more\s+than)\s*(\d{1,3}(?:,\d{3})*|\d+)$", s, re.IGNORECASE)
    if m_plus:
        num = int(m_plus.group(1).replace(",", ""))
        if num < 0:
            raise ValueError("Users count cannot be negative.")
        if num > MAX_USERS:
            raise ValueError(f"Users count exceeds maximum allowed limit of {MAX_USERS:,}.")
        return s

    # Case C: Range "X - Y", "X – Y", "X — Y", "X to Y"
    m_range = re.match(
        r"^(\d{1,3}(?:,\d{3})*|\d+)\s*(?:[–—-]|to)\s*(\d{1,3}(?:,\d{3})*|\d+)$",
        s,
        re.IGNORECASE,
    )
    if m_range:
        low = int(m_range.group(1).replace(",", ""))
        high = int(m_range.group(2).replace(",", ""))
        if low < 0 or high < 0:
            raise ValueError("Users count range cannot contain negative numbers.")
        if low >= high:
            raise ValueError("Users count range minimum must be less than maximum.")
        if high > MAX_USERS:
            raise ValueError(f"Users count range exceeds maximum allowed limit of {MAX_USERS:,}.")
        return s

    # Case D: Single positive number (with optional thousands commas, optional leading +)
    m_single = re.match(r"^\+?(\d{1,3}(?:,\d{3})*|\d+)$", s)
    if m_single:
        num = int(m_single.group(1).replace(",", ""))
        if num < 0:
            raise ValueError("Users count cannot be negative.")
        if num > MAX_USERS:
            raise ValueError(f"Users count exceeds maximum allowed limit of {MAX_USERS:,}.")
        return s

    raise ValueError(
        f"Invalid users value: '{v}'. Must be a valid positive user count (up to {MAX_USERS:,}) "
        "or supported range (e.g., '1,000–10,000', '100–1,000', 'Less than 100', '10,000+')."
    )


MAX_PROJECT_NAME_LENGTH = 150


def _validate_project_name(v: Any) -> str:
    if v is None:
        raise ValueError("Project name is required and cannot be null.")
    if isinstance(v, bool) or not isinstance(v, str):
        raise ValueError("Project name must be a string.")
    s = v.strip()
    if not s:
        raise ValueError("Project name cannot be empty or whitespace-only.")
    if len(s) > MAX_PROJECT_NAME_LENGTH:
        raise ValueError(f"Project name must not exceed {MAX_PROJECT_NAME_LENGTH} characters.")
    if not any(c.isalnum() for c in s):
        raise ValueError("Project name must contain at least one alphanumeric character.")
    return s


def _validate_features(v: Any) -> List[str]:
    if not isinstance(v, list):
        raise ValueError("Features must be a list of strings.")
    cleaned = []
    for item in v:
        if isinstance(item, bool) or not isinstance(item, str):
            raise ValueError("Each feature item must be a string.")
        trimmed = item.strip()
        if not trimmed:
            raise ValueError("Feature entries cannot be empty or contain only whitespace.")
        cleaned.append(trimmed)
    return cleaned


def _validate_platforms(v: Any) -> List[str]:
    if not isinstance(v, list):
        raise ValueError("Platforms must be a list of strings.")
    if not v:
        raise ValueError("Platforms list cannot be empty. At least one platform must be specified.")
    cleaned = []
    seen = set()
    for item in v:
        if isinstance(item, bool) or not isinstance(item, str):
            raise ValueError("Each platform item must be a string.")
        trimmed = item.strip()
        if not trimmed:
            raise ValueError("Platform entries cannot be empty or contain only whitespace.")
        lowered = trimmed.lower()
        if lowered in seen:
            raise ValueError(f"Duplicate platform '{trimmed}' is not allowed.")
        seen.add(lowered)
        cleaned.append(trimmed)
    return cleaned


MAX_DESCRIPTION_LENGTH = 5_000


def _validate_description(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, bool) or not isinstance(v, str):
        raise ValueError("Description must be a string.")
    s = v.strip()
    if len(s) > MAX_DESCRIPTION_LENGTH:
        raise ValueError(
            f"Project description must not exceed {MAX_DESCRIPTION_LENGTH:,} characters."
        )
    return s


class EstimateInput(BaseModel):
    projectName: str
    projectType: str = "Web Application"
    description: Optional[str] = ""
    github_url: Optional[str] = ""
    deployed_url: Optional[str] = ""
    features: List[str] = []
    users: Union[int, str] = "1,000–10,000"
    platforms: List[str] = ["Web"]
    buyerType: str = "freelancer"
    audience: str = "internal"

    @field_validator("projectName", mode="before")
    @classmethod
    def validate_project_name_field(cls, v: Any) -> str:
        return _validate_project_name(v)

    @field_validator("users", mode="before")
    @classmethod
    def validate_users_field(cls, v: Any) -> str:
        return _validate_users(v)

    @field_validator("features", mode="before")
    @classmethod
    def validate_features_field(cls, v: Any) -> List[str]:
        return _validate_features(v)

    @field_validator("platforms", mode="before")
    @classmethod
    def validate_platforms_field(cls, v: Any) -> List[str]:
        return _validate_platforms(v)

    @field_validator("description", mode="before")
    @classmethod
    def validate_description_field(cls, v: Any) -> str:
        return _validate_description(v)







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


def _validate_password_strength(password: str) -> str:
    """Enforce minimum password security policy."""
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if len(password) > 128:
        raise ValueError("Password must not exceed 128 characters.")
    if not re.search(r"[A-Z]", password):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':,./<>?|`~]", password):
        raise ValueError("Password must contain at least one special character (e.g. !@#$%).")
    return password


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Name must not be empty.")
        if len(v) > 100:
            raise ValueError("Name must not exceed 100 characters.")
        return v


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

    @field_validator("new_password")
    @classmethod
    def new_password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


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

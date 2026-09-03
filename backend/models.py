from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional


class EstimateInput(BaseModel):
    projectName: Optional[str] = None
    projectType: str = "Web Application"
    description: Optional[str] = ""
    features: List[str] = []
    users: str = "1,000–10,000"
    platforms: List[str] = ["Web"]


class SignupInput(BaseModel):
    name: str = Field(min_length=1)
    email: EmailStr
    password: str = Field(min_length=8)


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1)


class ForgotPasswordInput(BaseModel):
    email: EmailStr
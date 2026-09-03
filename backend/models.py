from pydantic import BaseModel
from typing import List, Optional


class EstimateInput(BaseModel):
    projectName: Optional[str] = None
    projectType: str = "Web Application"
    description: Optional[str] = ""
    features: List[str] = []
    users: str = "1,000–10,000"
    platforms: List[str] = ["Web"]
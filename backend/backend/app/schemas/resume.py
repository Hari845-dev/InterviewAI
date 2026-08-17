from datetime import datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.common import EvidenceSource


class ProjectItem(BaseModel):
    title: str
    description: str = ""
    tech_stack: list[str] = Field(default_factory=list)


class ExperienceItem(BaseModel):
    role: str
    company: str = ""
    duration_months: int = 0
    responsibilities: list[str] = Field(default_factory=list)


class EducationItem(BaseModel):
    degree: str = ""
    institution: str = ""
    year: int = 0


class StructuredProfile(BaseModel):
    name: str | None = None
    skills: list[str] = Field(default_factory=list)
    projects: list[ProjectItem] = Field(default_factory=list)
    experience: list[ExperienceItem] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    education: list[EducationItem] = Field(default_factory=list)


class ResumeProfileResponse(BaseModel):
    resume_hash: str
    structured_profile: StructuredProfile
    cached: bool
    created_at: datetime | None = None
    filename: str | None = None

    @computed_field
    @property
    def upload_date(self) -> datetime | None:
        return self.created_at


class ResumeAnalysisResponse(BaseModel):
    resume_hash: str
    structured_profile: StructuredProfile
    skills_count: int
    projects_count: int
    experience_count: int


class ResumeListItem(BaseModel):
    id: str
    resume_hash: str
    filename: str
    upload_date: datetime | None = None
    structured_profile: StructuredProfile
    extracted_skills: list[str] = Field(default_factory=list)
    projects_count: int = 0
    experience_count: int = 0
    is_active: bool = False
    created_at: datetime | None = None
    updated_at: datetime | None = None

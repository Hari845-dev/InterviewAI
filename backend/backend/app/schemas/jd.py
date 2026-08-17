from datetime import datetime

from pydantic import BaseModel, Field


class StructuredJD(BaseModel):
    """
    Structured representation of a parsed job description.
    """

    job_title: str | None = None
    company: str | None = None
    location: str | None = None
    employment_type: str | None = None

    experience_required: str | None = None
    salary_range: str | None = None

    summary: str | None = None

    required_skills: list[str] = Field(
        default_factory=list
    )

    preferred_skills: list[str] = Field(
        default_factory=list
    )

    responsibilities: list[str] = Field(
        default_factory=list
    )

    qualifications: list[str] = Field(
        default_factory=list
    )

    education_requirements: list[str] = Field(
        default_factory=list
    )

    certifications: list[str] = Field(
        default_factory=list
    )

    nice_to_have: list[str] = Field(
        default_factory=list
    )

    other_requirements: list[str] = Field(
        default_factory=list
    )


class JDProfileResponse(BaseModel):
    jd_hash: str
    filename: str | None = None
    structured_jd: StructuredJD
    cached: bool
    created_at: datetime | None = None


class JDListItem(BaseModel):
    """
    Lightweight representation used by the JD management page.
    """

    id: str
    jd_hash: str
    filename: str | None = None

    job_title: str | None = None
    company: str | None = None
    location: str | None = None
    employment_type: str | None = None

    created_at: datetime | None = None
    updated_at: datetime | None = None

    structured_jd: StructuredJD


# ============================================================
# EVIDENCE-BASED MATCHING
# ============================================================

class SkillEvidence(BaseModel):
    """
    Evidence explaining why a resume skill matches a JD skill.
    """

    skill: str

    status: str = Field(
        description="matched, partial, or missing"
    )

    evidence_type: str = Field(
        description="skill, project, experience, certification, education, or none"
    )

    evidence: str = ""

    confidence: float = Field(
        default=0.0,
        ge=0,
        le=100,
    )


class SkillMatchResponse(BaseModel):
    resume_hash: str
    jd_hash: str

    matched_skills: list[str]
    missing_skills: list[str]
    weak_areas: list[str]

    resume_skills: list[str]
    jd_required_skills: list[str]

    # New evidence-based fields
    skill_evidence: list[SkillEvidence] = Field(
        default_factory=list
    )

    partial_skills: list[str] = Field(
        default_factory=list
    )

    required_match_percentage: float = Field(
        default=0.0,
        ge=0,
        le=100,
    )
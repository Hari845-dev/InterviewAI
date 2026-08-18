from typing import Literal

from pydantic import BaseModel, Field, computed_field


Difficulty = Literal["easy", "medium", "hard"]

QuestionCategory = Literal[
    "project",
    "experience",
    "technical",
    "hr",
    "quiz",
    "jd_matched",
    "problem_solving",
    "follow_up",
    "aptitude",
]

SessionMode = Literal[
    "job_specific",
    "self_based",
    "quiz",
    "aptitude",
]

SessionStatus = Literal[
    "in_progress",
    "completed",
]

AptitudeCategory = Literal[
    "quantitative",
    "verbal",
    "logical",
]

EvidenceSource = Literal[
    "resume",
    "skill_bank",
]


class ErrorResponse(BaseModel):
    detail: str


class SystemStatusResponse(BaseModel):
    mongodb_connected: bool

    # Kept for backward compatibility with the existing
    # frontend/API contract.
    gemini_available: bool

    # New provider-aware status information.
    groq_available: bool = False
    ai_available: bool = False
    ai_primary_provider: str = "groq"
    ai_fallback_provider: str = "gemini"

    resume_cache_active: bool
    skill_cache_active: bool
    aptitude_bank_count: int


class GenerationSummary(BaseModel):
    questions_requested: int
    cached_questions: int
    fresh_questions: int
    cache_hit_rate: float = Field(
        description="Percentage 0-100"
    )

    # Kept for backward compatibility.
    # The number now represents AI-generation requests,
    # regardless of whether Groq or Gemini handled them.
    gemini_requests_made: int

    @computed_field
    @property
    def gemini_requests(self) -> int:
        return self.gemini_requests_made
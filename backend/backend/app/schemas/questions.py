from pydantic import BaseModel, Field

from app.schemas.common import Difficulty, EvidenceSource, GenerationSummary, QuestionCategory


class EvidenceObject(BaseModel):
    source: EvidenceSource
    section: str | None = None
    reference: str
    snippet: str | None = None


class InterviewQuestion(BaseModel):
    question_id: str
    category: str
    difficulty: Difficulty
    question: str
    suggested_answer: str = ""
    skill_tag: str | None = None
    evidence: EvidenceObject
    source: str = "cache"
    linked_to: str | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    why_asked: list[str] = Field(default_factory=list)
    focus: str | None = None


class QuestionDistribution(BaseModel):
    project: int = 4
    technical: int = 5
    hr: int = 3
    jd_matched: int = 3
    problem_solving: int = 3
    follow_up: int = 2


class GenerateInterviewRequest(BaseModel):
    resume_hash: str
    jd_hash: str | None = None
    mode: str = "job_specific"
    total_questions: int = Field(default=20, ge=1, le=50)
    distribution: QuestionDistribution | None = None


class GenerateQuizRequest(BaseModel):
    resume_hash: str
    skills: list[str] | None = None
    total_questions: int = Field(default=10, ge=1, le=30)
    difficulty: Difficulty | None = None


class GenerateInterviewResponse(BaseModel):
    questions: list[InterviewQuestion]
    generation_summary: GenerationSummary
    resume_hash: str
    jd_hash: str | None = None


class GenerateQuizResponse(BaseModel):
    questions: list[InterviewQuestion]
    generation_summary: GenerationSummary


class AptitudeQuestion(BaseModel):
    question_id: str
    category: str
    topic: str
    difficulty: str
    question: str
    options: list[str]
    correct_answer: str | None = None
    explanation: str = ""

class AptitudeResponse(BaseModel):
    questions: list[AptitudeQuestion]
    total: int

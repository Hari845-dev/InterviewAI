from datetime import datetime

from pydantic import BaseModel, Field, computed_field

from app.schemas.common import GenerationSummary, SessionMode, SessionStatus
from app.schemas.questions import InterviewQuestion


class AnswerFeedback(BaseModel):
    score: float = Field(ge=0, le=100)
    strengths: list[str] = Field(default_factory=list)
    weaknesses: list[str] = Field(default_factory=list)
    missing_points: list[str] = Field(default_factory=list)
    improvement_suggestions: list[str] = Field(default_factory=list)
    ideal_answer: str = ""


class SessionAnswer(BaseModel):
    question_id: str
    user_answer: str
    submitted_at: datetime
    ai_feedback: AnswerFeedback | None = None
    score: float | None = None
    is_correct: bool | None = None


class QuestionServed(BaseModel):
    question_id: str
    question: str
    category: str
    source: str
    difficulty: str = "medium"
    skill_tag: str | None = None
    evidence: dict | None = None
    options: list[str] | None = None
    correct_answer: str | None = None
    why_asked: list[str] = Field(default_factory=list)
    focus: str | None = None
    suggested_answer: str = ""


class CreateSessionRequest(BaseModel):
    resume_hash: str
    jd_hash: str | None = None
    mode: SessionMode = "job_specific"
    title: str | None = None
    role: str | None = None
    difficulty: str | None = None
    total_questions: int | None = None
    questions: list[InterviewQuestion] | None = None
    generation_summary: GenerationSummary | None = None


class SubmitAnswerRequest(BaseModel):
    question_id: str
    user_answer: str


class SessionResponse(BaseModel):
    session_id: str
    user_id: str
    resume_hash: str
    jd_hash: str | None = None
    mode: SessionMode
    status: SessionStatus
    current_question_index: int
    questions_served: list[QuestionServed]
    answers: list[SessionAnswer]
    overall_score: float | None = None
    started_at: datetime
    completed_at: datetime | None = None
    title: str | None = None
    role: str | None = None
    difficulty: str | None = None
    total_questions: int | None = None

    @computed_field
    @property
    def questions(self) -> list[QuestionServed]:
        return self.questions_served

    @computed_field
    @property
    def responses(self) -> list[SessionAnswer]:
        return self.answers

    @computed_field
    @property
    def created_at(self) -> datetime:
        return self.started_at


class SubmitAnswerResponse(BaseModel):
    feedback: AnswerFeedback | None = None
    is_correct: bool | None = None
    follow_up_question: QuestionServed | None = None
    next_question: QuestionServed | None = None
    is_completed: bool = False
    current_score: float | None = None
    session: SessionResponse


class SessionStatsResponse(BaseModel):
    session_id: str
    total_sessions: int = 1
    questions_attempted: int
    questions_completed: int
    average_score: float
    technical_score: float
    hr_score: float
    aptitude_score: float
    quiz_score: float
    accuracy: float
    strong_skills: list[str]
    weak_skills: list[str]
    cache_hit_rate: float
    cached_questions: int
    fresh_questions: int
    gemini_requests: int
    generation_summary: GenerationSummary | None = None


class SessionHistoryItem(BaseModel):
    """Strictly typed session history item for dashboard display.
    
    All fields except 'id' are optional to handle edge cases where data may be partially populated.
    Frontend expects all these fields: mode, status, overall_score, and started_at are additional
    fields beyond basic session info that the dashboard provides.
    """
    id: str
    session_id: str | None = None
    title: str | None = None
    date: str | None = None  # ISO format timestamp string
    score: float | None = None
    questions_attempted: int = 0
    total_questions: int = 0
    type: str | None = None  # session mode: self_based, job_specific, quiz, aptitude
    mode: str | None = None  # duplicate of type for backward compatibility
    status: SessionStatus | None = None  # in_progress, completed
    overall_score: float | None = None
    started_at: datetime | None = None  # datetime object


class DashboardMetrics(BaseModel):
    total_sessions: int
    questions_attempted: int
    questions_completed: int
    average_score: float
    technical_score: float
    hr_score: float
    aptitude_score: float
    quiz_score: float
    accuracy: float
    strong_skills: list[str]
    weak_skills: list[str]
    cache_hit_rate: float
    cached_questions: int
    fresh_questions: int
    gemini_requests: int
    session_history: list[SessionHistoryItem]

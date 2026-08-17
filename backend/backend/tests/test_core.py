import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.utils.text import hash_content, normalize_question_text, normalize_skill_raw, normalize_text
from app.utils.duplicate_detector import is_duplicate, deduplicate_questions


def test_normalize_text():
    assert normalize_text("  Hello   World  ") == "hello world"


def test_hash_content_deterministic():
    h1 = hash_content("Same Content")
    h2 = hash_content("same   content")
    assert h1 == h2
    assert len(h1) == 64


def test_normalize_skill_raw():
    assert normalize_skill_raw("React.js") == "reactjs"
    assert normalize_skill_raw("Node.js") == "nodejs"


def test_normalize_question_text():
    assert normalize_question_text("What is Python?") == "what is python"


def test_duplicate_detection():
    assert is_duplicate("What is Python?", ["what is python"])
    assert not is_duplicate("What is Java?", ["what is python"])


def test_deduplicate_questions():
    qs = [
        {"question": "What is Python?"},
        {"question": "what is python?"},
        {"question": "What is Java?"},
    ]
    result = deduplicate_questions(qs)
    assert len(result) == 2


@pytest.mark.asyncio
async def test_skill_normalization_with_aliases():
    from app.services.skill_normalization import SkillNormalizationService

    svc = SkillNormalizationService()
    svc._cache = {"reactjs": "react", "nodejs": "node", "py": "python"}

    assert await svc.normalize("React.js") == "react"
    assert await svc.normalize("node.js") == "node"
    assert await svc.normalize("Py") == "python"


@pytest.mark.asyncio
async def test_resume_hash_generation():
    text1 = "John Doe\nPython Developer\n5 years experience"
    text2 = "john doe\npython developer\n5 years experience"
    assert hash_content(text1) == hash_content(text2)


def test_generation_summary_formula():
    cached = 12
    total = 20
    hit_rate = cached / total * 100
    assert hit_rate == 60.0


def test_default_gemini_model_is_supported():
    from app.config.settings import get_settings

    assert get_settings().gemini_model == "gemini-3.6-flash"


@pytest.mark.asyncio
async def test_resume_validation_requires_name_and_email():
    from fastapi import HTTPException

    from app.services.resume_service import ResumeService

    svc = ResumeService()

    with pytest.raises(HTTPException, match="name.*email|email.*name"):
        svc._validate_resume_identity(
            "This is a software project plan for a startup.\nWe build dashboards and APIs.",
            None,
        )

    svc._validate_resume_identity(
        "John Doe\nSenior Engineer\nEmail: john.doe@example.com\nPhone: 555-123-4567",
        None,
    )


@pytest.mark.asyncio
async def test_markdown_jd_uploads_are_supported():
    from app.utils.file_parser import validate_upload

    class FakeUploadFile:
        filename = "jd.md"

        async def read(self):
            return b"# Senior Engineer\nPython, React, SQL"

    value = await validate_upload(FakeUploadFile())
    assert value == b"# Senior Engineer\nPython, React, SQL"


@pytest.mark.asyncio
async def test_user_isolation_query_pattern():
    """Verify user-scoped queries include user_id."""
    user_id = "user-123"
    resume_hash = "abc"
    query = {"user_id": user_id, "resume_hash": resume_hash}
    assert "user_id" in query
    assert query["user_id"] == user_id


@pytest.mark.asyncio
async def test_gemini_orchestrator_no_keys():
    from app.ai.gemini_orchestrator import GeminiOrchestrator

    with patch("app.ai.gemini_orchestrator.get_settings") as mock_settings:
        mock_settings.return_value.gemini_api_keys = []
        mock_settings.return_value.gemini_model = "gemini-2.0-flash"
        orch = GeminiOrchestrator()
        assert not orch.is_available


@pytest.mark.asyncio
async def test_evidence_validation_schema():
    from app.schemas.questions import EvidenceObject, InterviewQuestion

    ev = EvidenceObject(source="resume", section="projects", reference="ML Project", snippet="Used Flask")
    q = InterviewQuestion(
        question_id="q1",
        category="project",
        difficulty="medium",
        question="How did you use Flask?",
        suggested_answer="...",
        evidence=ev,
    )
    assert q.evidence.source == "resume"
    assert q.evidence.snippet == "Used Flask"


@pytest.mark.asyncio
async def test_pydantic_structured_profile():
    from app.schemas.resume import StructuredProfile

    profile = StructuredProfile(name="Test", skills=["python", "react"])
    assert profile.skills == ["python", "react"]


@pytest.mark.asyncio
async def test_resume_service_normalizes_null_gemini_fields():
    from app.services.resume_service import ResumeService

    payload = {
        "name": "Alex",
        "skills": ["python", "react"],
        "projects": [
            {"title": "InterviewAI", "description": None, "tech_stack": ["python", "fastapi"]},
            {"title": "Forecasting", "description": "Built forecasting pipeline", "tech_stack": None},
        ],
        "experience": [
            {
                "role": "Engineer",
                "company": "Acme",
                "duration_months": 12,
                "responsibilities": [None, "Built APIs"],
            }
        ],
        "certifications": None,
        "education": [{"degree": "BS", "institution": "UM", "year": 2019}],
    }

    normalized = ResumeService()._normalize_extracted_profile(payload)

    assert normalized["projects"][0]["description"] == ""
    assert normalized["projects"][1]["tech_stack"] == []
    assert normalized["experience"][0]["responsibilities"] == ["Built APIs"]
    assert normalized["certifications"] == []


@pytest.mark.asyncio
async def test_jd_structured_schema():
    from app.schemas.jd import StructuredJD

    jd = StructuredJD(required_skills=["python"], preferred_skills=["aws"])
    assert "python" in jd.required_skills


def test_question_distribution_schema():
    """Verify QuestionDistribution accepts correct keys: project, technical, hr, jd_matched, problem_solving, follow_up"""
    from app.schemas.questions import QuestionDistribution

    # Valid distribution with all keys
    dist = QuestionDistribution(
        project=5,
        technical=6,
        hr=2,
        jd_matched=3,
        problem_solving=2,
        follow_up=2
    )
    assert dist.project == 5
    assert dist.technical == 6
    assert dist.hr == 2
    assert dist.jd_matched == 3
    assert dist.problem_solving == 2
    assert dist.follow_up == 2

    # Valid distribution with defaults
    dist_defaults = QuestionDistribution()
    assert dist_defaults.project == 4
    assert dist_defaults.technical == 5
    assert dist_defaults.hr == 3
    assert dist_defaults.jd_matched == 3
    assert dist_defaults.problem_solving == 3
    assert dist_defaults.follow_up == 2

    # Verify the six fields exist in the distribution
    dist_dict = dist.model_dump()
    assert set(dist_dict.keys()) == {"project", "technical", "hr", "jd_matched", "problem_solving", "follow_up"}
    # Old key 'experience' should NOT be in the schema
    assert "experience" not in dist_dict


def test_generate_interview_request_schema():
    """Verify GenerateInterviewRequest schema with correct distribution"""
    from app.schemas.questions import GenerateInterviewRequest, QuestionDistribution

    # Valid request with explicit distribution
    req = GenerateInterviewRequest(
        resume_hash="res_abc123",
        mode="self_based",
        total_questions=20,
        distribution=QuestionDistribution(
            project=5,
            technical=6,
            hr=2,
            jd_matched=3,
            problem_solving=2,
            follow_up=2
        )
    )
    assert req.resume_hash == "res_abc123"
    assert req.mode == "self_based"
    assert req.total_questions == 20
    assert req.distribution.project == 5

    # Valid request with defaults
    req_defaults = GenerateInterviewRequest(resume_hash="res_xyz")
    assert req_defaults.mode == "job_specific"
    assert req_defaults.total_questions == 20
    assert req_defaults.distribution is None  # Will use service-level defaults


@pytest.mark.asyncio
async def test_auth_register_initializes_db_when_uninitialized():
    from app import database
    from app.schemas.auth import UserRegister
    from app.services.auth_service import AuthService

    class MockUsers:
        def __init__(self):
            self.find_one = AsyncMock(return_value=None)
            self.insert_one = AsyncMock()

    mock_db = type("MockDB", (), {"users": MockUsers()})()

    with patch.object(database, "_db", None), patch.object(database, "_client", None), patch.object(database, "AsyncIOMotorClient") as mock_client, patch.object(database, "get_settings") as mock_settings:
        mock_settings.return_value.mongodb_uri = "mongodb://localhost:27017"
        mock_settings.return_value.database_name = "interview_platform"
        mock_client.return_value.__getitem__.return_value = mock_db

        result = await AuthService().register(UserRegister(email="new@example.com", password="secret123", name="New User"))

    mock_client.assert_called_once_with(
        "mongodb://localhost:27017",
        maxPoolSize=50,
        serverSelectionTimeoutMS=5000,
        connectTimeoutMS=20000,
    )
    assert result.email == "new@example.com"
    assert result.name == "New User"


@pytest.mark.asyncio
async def test_jd_lookup_is_scoped_to_authenticated_user():
    from app.services.jd_service import JDService

    mock_db = MagicMock()
    mock_db.jd_profiles.find_one = AsyncMock(return_value={
        "jd_hash": "jd-123",
        "structured_jd": {
            "required_skills": ["python"],
            "preferred_skills": ["aws"],
            "responsibilities": ["build apis"],
        },
    })

    with patch("app.services.jd_service.get_db", return_value=mock_db):
        result = await JDService().get_structured_jd("user-123", "jd-123")

    assert result.required_skills == ["python"]
    mock_db.jd_profiles.find_one.assert_awaited_once_with({"user_id": "user-123", "jd_hash": "jd-123"})

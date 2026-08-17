"""API integration tests with mocked MongoDB and Gemini."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.utils.auth import create_access_token


@pytest.fixture
def auth_headers():
    token = create_access_token("user-test-1", "test@example.com", "Test User")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def mock_db():
    db = MagicMock()
    db.users = MagicMock()
    db.users.find_one = AsyncMock(return_value=None)
    db.users.insert_one = AsyncMock()
    db.resume_profiles = MagicMock()
    db.resume_profiles.find_one = AsyncMock(return_value=None)
    db.resume_profiles.insert_one = AsyncMock()
    db.resume_profiles.update_one = AsyncMock()
    db.jd_profiles = MagicMock()
    db.jd_profiles.find_one = AsyncMock(return_value=None)
    db.jd_profiles.insert_one = AsyncMock()
    db.skill_question_bank = MagicMock()
    db.skill_question_bank.find_one = AsyncMock(return_value=None)
    db.skill_question_bank.update_one = AsyncMock()
    db.resume_question_bank = MagicMock()
    db.resume_question_bank.find_one = AsyncMock(return_value=None)
    db.resume_question_bank.update_one = AsyncMock()
    db.aptitude_bank = MagicMock()
    db.aptitude_bank.count_documents = AsyncMock(return_value=250)
    db.aptitude_bank.aggregate = MagicMock(return_value=_async_iter([]))
    db.interview_sessions = MagicMock()
    db.interview_sessions.insert_one = AsyncMock()
    db.interview_sessions.find_one = AsyncMock(return_value=None)
    db.interview_sessions.update_one = AsyncMock()
    db.interview_sessions.find = MagicMock(return_value=_async_iter([]))
    db.skill_aliases = MagicMock()
    db.skill_aliases.find_one = AsyncMock(return_value=None)
    db.gemini_key_state = MagicMock()
    db.gemini_key_state.update_one = AsyncMock()
    db.command = AsyncMock()
    return db


async def _async_iter(items):
    for item in items:
        yield item


@pytest.mark.asyncio
async def test_status_endpoint(mock_db):
    with patch("app.services.status_service.ping_db", AsyncMock(return_value=False)):
        with patch("app.services.status_service.AptitudeService.count", AsyncMock(return_value=0)):
            transport = ASGITransport(app=app)
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/status")
    assert res.status_code == 200
    data = res.json()
    assert data["mongodb_connected"] is False
    assert "gemini_available" in data


@pytest.mark.asyncio
async def test_dashboard_history_returns_session_history_item_shape(auth_headers):
    db = MagicMock()
    session_docs = [{
        "_id": "s-123",
        "user_id": "user-test-1",
        "resume_hash": "res_1",
        "jd_hash": None,
        "mode": "self_based",
        "status": "completed",
        "current_question_index": 1,
        "questions_served": [{"question_id": "q1", "question": "Question 1", "category": "technical", "source": "cache"}],
        "answers": [{
            "question_id": "q1",
            "user_answer": "I described the architecture",
            "submitted_at": "2024-01-01T00:00:00",
            "ai_feedback": {"score": 88.0},
            "score": 88.0,
            "is_correct": True,
        }],
        "overall_score": 88.0,
        "started_at": "2024-01-01T00:00:00",
        "completed_at": "2024-01-01T00:05:00",
        "title": "Session 1",
        "role": "Engineer",
        "difficulty": "medium",
        "metrics": {"cached_questions": 0, "fresh_questions": 1, "gemini_requests": 0},
    }]

    class AsyncCursor:
        def __init__(self, items):
            self._items = list(items)
            self._index = 0

        def sort(self, *args, **kwargs):
            return self

        def __aiter__(self):
            return self

        async def __anext__(self):
            if self._index >= len(self._items):
                raise StopAsyncIteration
            item = self._items[self._index]
            self._index += 1
            return item

    cursor = AsyncCursor(session_docs)
    db.interview_sessions.find.return_value = cursor

    with patch("app.services.session_service.get_db", return_value=db):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/dashboard", headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert data["session_history"][0]["id"] == "s-123"
    assert data["session_history"][0]["session_id"] == "s-123"
    assert data["session_history"][0]["title"] == "Session 1"
    assert data["session_history"][0]["date"] == "2024-01-01T00:00:00"
    assert data["session_history"][0]["score"] == 88.0
    assert data["session_history"][0]["questions_attempted"] == 1
    assert data["session_history"][0]["total_questions"] == 1
    assert data["session_history"][0]["type"] == "self_based"


@pytest.mark.asyncio
async def test_upload_resume_rejects_oversized(auth_headers):
  transport = ASGITransport(app=app)
  big = b"x" * (5 * 1024 * 1024 + 1)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    res = await client.post(
      "/resumes",
      headers=auth_headers,
      files={"file": ("resume.txt", big, "text/plain")},
    )
  assert res.status_code == 413


@pytest.mark.asyncio
async def test_upload_resume_rejects_unsupported_type(auth_headers):
  transport = ASGITransport(app=app)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    res = await client.post(
      "/resumes",
      headers=auth_headers,
      files={"file": ("resume.exe", b"data", "application/octet-stream")},
    )
  assert res.status_code == 400


@pytest.mark.asyncio
async def test_protected_route_requires_auth():
  transport = ASGITransport(app=app)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    res = await client.get("/dashboard")
  assert res.status_code == 401


@pytest.mark.asyncio
async def test_resume_cache_hit(mock_db, auth_headers):
  cached_profile = {
    "_id": "doc1",
    "user_id": "user-test-1",
    "resume_hash": "abc123",
    "structured_profile": {
      "name": "Test",
      "skills": ["python"],
      "projects": [],
      "experience": [],
      "certifications": [],
      "education": [],
    },
    "created_at": "2026-01-01T00:00:00Z",
    "hit_count": 1,
  }
  mock_db.resume_profiles.find_one = AsyncMock(return_value=cached_profile)

  with patch("app.services.resume_service.get_db", return_value=mock_db):
    with patch("app.services.resume_service.validate_upload", AsyncMock(return_value=b"x" * 60)):
      with patch("app.services.resume_service.hash_content", return_value="abc123"):
        with patch(
          "app.services.resume_service.extract_text_from_bytes",
          return_value="a" * 60,
        ):
          transport = ASGITransport(app=app)
          async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.post(
              "/resumes",
              headers=auth_headers,
              files={"file": ("resume.txt", b"x" * 60, "text/plain")},
            )
  assert res.status_code == 200
  assert res.json()["cached"] is True


@pytest.mark.asyncio
async def test_gemini_key_rotation_on_429():
  from app.ai.gemini_orchestrator import GeminiOrchestrator

  with patch("app.ai.gemini_orchestrator.get_settings") as mock_settings:
    mock_settings.return_value.gemini_api_keys = ["key1", "key2"]
    mock_settings.return_value.gemini_model = "gemini-2.0-flash"
    orch = GeminiOrchestrator()

    call_count = 0

    def fake_generate(*args, **kwargs):
      nonlocal call_count
      call_count += 1
      if call_count == 1:
        raise Exception("429 quota exceeded")
      mock_resp = MagicMock()
      mock_resp.text = '{"result": "ok"}'
      return mock_resp

    with patch("app.ai.gemini_orchestrator.genai.configure"):
      with patch("app.ai.gemini_orchestrator.genai.GenerativeModel") as mock_model_cls:
        mock_model_cls.return_value.generate_content = fake_generate
        with patch("app.ai.gemini_orchestrator.get_db") as mock_get_db:
          mock_get_db.return_value.gemini_key_state.update_one = AsyncMock()
          parsed, count = await orch.generate_json("test prompt")
    assert parsed == {"result": "ok"}
    assert count == 1


@pytest.mark.asyncio
async def test_finalize_session_route_marks_session_complete(auth_headers):
    db = MagicMock()
    db.interview_sessions.find_one = AsyncMock(return_value={
        "_id": "s-finalize",
        "user_id": "user-test-1",
        "resume_hash": "res_1",
        "jd_hash": None,
        "mode": "self_based",
        "status": "in_progress",
        "current_question_index": 1,
        "questions_served": [
            {"question_id": "q1", "question": "Q1", "category": "technical", "source": "cache", "difficulty": "medium", "why_asked": [], "suggested_answer": "A1"},
            {"question_id": "q2", "question": "Q2", "category": "technical", "source": "cache", "difficulty": "medium", "why_asked": [], "suggested_answer": "A2"},
        ],
        "answers": [{
            "question_id": "q1",
            "user_answer": "Answer 1",
            "submitted_at": "2024-01-01T00:00:00",
            "score": 80.0,
            "ai_feedback": {"score": 80.0},
        }],
        "overall_score": None,
        "started_at": "2024-01-01T00:00:00",
        "completed_at": None,
        "metrics": {"cached_questions": 2, "fresh_questions": 0, "gemini_requests": 0},
    })
    db.interview_sessions.update_one = AsyncMock()

    with patch("app.services.session_service.get_db", return_value=db):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.patch("/sessions/s-finalize", headers=auth_headers)

    assert res.status_code == 200
    payload = res.json()
    assert payload["status"] == "completed"
    assert payload["completed_at"] is not None


@pytest.mark.asyncio
async def test_list_sessions_returns_only_current_user(auth_headers):
    db = MagicMock()
    session_docs = [
        {
            "_id": "s1",
            "user_id": "user-test-1",
            "resume_hash": "res_1",
            "jd_hash": None,
            "mode": "self_based",
            "status": "completed",
            "current_question_index": 2,
            "questions_served": [],
            "answers": [],
            "overall_score": 82.5,
            "started_at": "2024-01-02T00:00:00",
            "completed_at": "2024-01-02T00:05:00",
            "title": "Session 1",
            "role": "Engineer",
            "difficulty": "medium",
            "metrics": {"cached_questions": 1, "fresh_questions": 1, "gemini_requests": 0},
        },
        {
            "_id": "s2",
            "user_id": "other-user",
            "resume_hash": "res_2",
            "jd_hash": None,
            "mode": "job_specific",
            "status": "in_progress",
            "current_question_index": 1,
            "questions_served": [],
            "answers": [],
            "overall_score": None,
            "started_at": "2024-01-01T00:00:00",
            "completed_at": None,
            "title": "Other Session",
            "role": "Engineer",
            "difficulty": "medium",
            "metrics": {"cached_questions": 0, "fresh_questions": 1, "gemini_requests": 0},
        },
    ]

    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = _async_iter([session_docs[0]])
    db.interview_sessions.find.return_value = cursor

    with patch("app.services.session_service.get_db", return_value=db):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/sessions", headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert len(data) == 1
    assert data[0]["session_id"] == "s1"
    assert data[0]["user_id"] == "user-test-1"
    db.interview_sessions.find.assert_called_with({"user_id": "user-test-1"})


@pytest.mark.asyncio
async def test_list_sessions_filters_out_other_users(auth_headers):
    db = MagicMock()
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = _async_iter([])
    db.interview_sessions.find.return_value = cursor

    with patch("app.services.session_service.get_db", return_value=db):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/sessions?limit=5&skip=0", headers=auth_headers)

    assert res.status_code == 200
    assert res.json() == []
    assert db.interview_sessions.find.call_args[0][0] == {"user_id": "user-test-1"}


@pytest.mark.asyncio
async def test_list_sessions_pagination(auth_headers):
    db = MagicMock()
    session_docs = [
        {
            "_id": f"s{i}",
            "user_id": "user-test-1",
            "resume_hash": f"res_{i}",
            "jd_hash": None,
            "mode": "self_based",
            "status": "completed",
            "current_question_index": 1,
            "questions_served": [],
            "answers": [],
            "overall_score": 90.0,
            "started_at": f"2024-01-0{i + 1}T00:00:00",
            "completed_at": f"2024-01-0{i + 1}T00:02:00",
            "title": f"Session {i}",
            "role": "Engineer",
            "difficulty": "medium",
            "metrics": {"cached_questions": 0, "fresh_questions": 1, "gemini_requests": 0},
        }
        for i in range(1, 5)
    ]

    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = _async_iter(session_docs[1:3])
    db.interview_sessions.find.return_value = cursor

    with patch("app.services.session_service.get_db", return_value=db):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/sessions?limit=2&skip=1", headers=auth_headers)

    assert res.status_code == 200
    data = res.json()
    assert len(data) == 2
    assert [s["session_id"] for s in data] == ["s2", "s3"]


@pytest.mark.asyncio
async def test_list_sessions_returns_newest_first(auth_headers):
    db = MagicMock()
    session_docs = [
        {
            "_id": "old",
            "user_id": "user-test-1",
            "resume_hash": "res_old",
            "jd_hash": None,
            "mode": "self_based",
            "status": "completed",
            "current_question_index": 1,
            "questions_served": [],
            "answers": [],
            "overall_score": 75.0,
            "started_at": "2024-01-01T00:00:00",
            "completed_at": "2024-01-01T00:10:00",
            "title": "Old",
            "role": "Engineer",
            "difficulty": "medium",
            "metrics": {"cached_questions": 0, "fresh_questions": 1, "gemini_requests": 0},
        },
        {
            "_id": "new",
            "user_id": "user-test-1",
            "resume_hash": "res_new",
            "jd_hash": None,
            "mode": "self_based",
            "status": "completed",
            "current_question_index": 1,
            "questions_served": [],
            "answers": [],
            "overall_score": 88.0,
            "started_at": "2024-01-03T00:00:00",
            "completed_at": "2024-01-03T00:10:00",
            "title": "New",
            "role": "Engineer",
            "difficulty": "medium",
            "metrics": {"cached_questions": 0, "fresh_questions": 1, "gemini_requests": 0},
        },
    ]

    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = _async_iter(session_docs[::-1])
    db.interview_sessions.find.return_value = cursor

    with patch("app.services.session_service.get_db", return_value=db):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/sessions?limit=10&skip=0", headers=auth_headers)

    assert res.status_code == 200
    assert [s["session_id"] for s in res.json()] == ["new", "old"]


@pytest.mark.asyncio
async def test_list_sessions_empty_history_returns_empty_list(auth_headers):
    db = MagicMock()
    cursor = MagicMock()
    cursor.sort.return_value = cursor
    cursor.skip.return_value = cursor
    cursor.limit.return_value = _async_iter([])
    db.interview_sessions.find.return_value = cursor

    with patch("app.services.session_service.get_db", return_value=db):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            res = await client.get("/sessions", headers=auth_headers)

    assert res.status_code == 200
    assert res.json() == []

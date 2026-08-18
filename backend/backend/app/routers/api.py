from fastapi import (
    APIRouter,
    Depends,
    File,
    HTTPException,
    Query,
    UploadFile,
)
from pydantic import BaseModel

from app.database import get_db
from app.schemas.common import SystemStatusResponse
from app.schemas.jd import (
    JDListItem,
    JDProfileResponse,
    SkillMatchResponse,
)
from app.schemas.questions import (
    AptitudeQuestion,
    GenerateInterviewRequest,
    GenerateInterviewResponse,
    GenerateQuizRequest,
    GenerateQuizResponse,
)
from app.schemas.resume import (
    ResumeAnalysisResponse,
    ResumeListItem,
    ResumeProfileResponse,
)
from app.schemas.sessions import (
    CreateSessionRequest,
    DashboardMetrics,
    SessionResponse,
    SessionStatsResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.services.aptitude_service import AptitudeService
from app.services.jd_service import JDService
from app.services.question_service import QuestionGenerationService
from app.services.resume_service import ResumeService
from app.services.session_service import SessionService
from app.services.status_service import StatusService
from app.utils.auth import get_current_user_id
from app.utils.text import utcnow

router = APIRouter(tags=["api"])


class JDTextRequest(BaseModel):
    text: str


# ============================================================
# HEALTH / STATUS
# ============================================================

@router.get(
    "/health",
    summary="Health check",
    description="Simple endpoint to confirm the API is running and responsive.",
)
async def health_check():
    return {"status": "ok"}


@router.get(
    "/status",
    response_model=SystemStatusResponse,
    summary="Get platform status",
    description="Returns the current health and readiness status of the interview platform services.",
)
async def system_status():
    return await StatusService().get_status()


# ============================================================
# RESUMES
# ============================================================

@router.get(
    "/resumes",
    response_model=list[ResumeListItem],
)
async def list_resumes(
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()

    docs = (
        await db.resume_profiles
        .find({"user_id": user_id})
        .sort("created_at", -1)
        .to_list(length=None)
    )

    items: list[ResumeListItem] = []

    for doc in docs:
        profile = (
            doc.get("structured_profile", {})
            or {}
        )

        skills = profile.get("skills", [])

        if isinstance(skills, dict):
            skills = [
                item
                for group in skills.values()
                for item in (
                    group
                    if isinstance(group, list)
                    else []
                )
            ]

        items.append(
            ResumeListItem(
                id=str(
                    doc.get(
                        "_id",
                        doc.get(
                            "resume_hash",
                            "",
                        ),
                    )
                ),
                resume_hash=doc["resume_hash"],
                filename=(
                    doc.get("filename")
                    or f"resume_{doc['resume_hash']}.pdf"
                ),
                upload_date=doc.get("created_at"),
                structured_profile=profile,
                extracted_skills=skills,
                projects_count=len(
                    profile.get("projects", [])
                ),
                experience_count=len(
                    profile.get("experience", [])
                ),
                is_active=bool(
                    doc.get("is_active", False)
                ),
                created_at=doc.get("created_at"),
                updated_at=(
                    doc.get("last_used_at")
                    or doc.get("created_at")
                ),
            )
        )

    return items


@router.post(
    "/resumes",
    response_model=ResumeProfileResponse,
)
async def upload_resume(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    return await ResumeService().upload_and_parse(
        user_id,
        file,
    )


@router.get(
    "/resumes/{resume_hash}",
    response_model=ResumeAnalysisResponse,
)
async def analyze_resume(
    resume_hash: str,
    user_id: str = Depends(get_current_user_id),
):
    return await ResumeService().get_analysis(
        user_id,
        resume_hash,
    )


@router.put(
    "/resumes/{resume_hash}/active",
)
async def set_active_resume(
    resume_hash: str,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()

    await db.resume_profiles.update_many(
        {"user_id": user_id},
        {"$set": {"is_active": False}},
    )

    result = await db.resume_profiles.update_one(
        {
            "user_id": user_id,
            "resume_hash": resume_hash,
        },
        {
            "$set": {
                "is_active": True,
                "last_used_at": utcnow(),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Resume not found",
        )

    return {
        "success": True,
        "resume_hash": resume_hash,
    }


@router.delete(
    "/resumes/{resume_hash}",
)
async def delete_resume(
    resume_hash: str,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()

    result = await db.resume_profiles.delete_one(
        {
            "user_id": user_id,
            "resume_hash": resume_hash,
        }
    )

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="Resume not found",
        )

    return {
        "success": True,
        "resume_hash": resume_hash,
    }


# ============================================================
# JOB DESCRIPTIONS
# ============================================================

@router.get(
    "/jds",
    response_model=list[JDListItem],
)
async def list_jds(
    user_id: str = Depends(get_current_user_id),
):
    docs = await JDService().list_jds(user_id)

    items: list[JDListItem] = []

    for doc in docs:
        structured = (
            doc.get("structured_jd", {})
            or {}
        )

        items.append(
            JDListItem(
                id=str(
                    doc.get(
                        "_id",
                        doc.get("jd_hash", ""),
                    )
                ),
                jd_hash=doc["jd_hash"],
                filename=doc.get("filename"),
                job_title=structured.get(
                    "job_title"
                ),
                company=structured.get(
                    "company"
                ),
                location=structured.get(
                    "location"
                ),
                employment_type=structured.get(
                    "employment_type"
                ),
                created_at=doc.get("created_at"),
                updated_at=(
                    doc.get("updated_at")
                    or doc.get("created_at")
                ),
                structured_jd=structured,
            )
        )

    return items


@router.post(
    "/jds",
    response_model=JDProfileResponse,
)
async def upload_jd(
    file: UploadFile = File(...),
    user_id: str = Depends(get_current_user_id),
):
    return await JDService().upload_and_parse(
        user_id,
        file,
    )


@router.post(
    "/jds/text",
    response_model=JDProfileResponse,
)
async def upload_jd_text(
    req: JDTextRequest,
    user_id: str = Depends(get_current_user_id),
):
    text = req.text.strip()

    if len(text) < 30:
        raise HTTPException(
            status_code=400,
            detail="JD text too short",
        )

    from starlette.datastructures import (
        UploadFile as StarletteUploadFile,
    )
    import io

    upload = StarletteUploadFile(
        io.BytesIO(text.encode("utf-8")),
        filename="job-description.txt",
    )

    return await JDService().upload_and_parse(
        user_id,
        upload,
    )


@router.get(
    "/jds/{jd_hash}",
    response_model=JDProfileResponse,
)
async def get_jd(
    jd_hash: str,
    user_id: str = Depends(get_current_user_id),
):
    db = get_db()

    doc = await db.jd_profiles.find_one(
        {
            "user_id": user_id,
            "jd_hash": jd_hash,
        }
    )

    if not doc:
        raise HTTPException(
            status_code=404,
            detail="JD not found",
        )

    return JDProfileResponse(
        jd_hash=doc["jd_hash"],
        filename=doc.get("filename"),
        structured_jd=doc.get(
            "structured_jd",
            {},
        ),
        cached=True,
        created_at=doc.get("created_at"),
    )


@router.delete(
    "/jds/{jd_hash}",
)
async def delete_jd(
    jd_hash: str,
    user_id: str = Depends(get_current_user_id),
):
    await JDService().delete_jd(
        user_id,
        jd_hash,
    )

    return {
        "success": True,
        "jd_hash": jd_hash,
    }


@router.get(
    "/jds/{resume_hash}/{jd_hash}/match",
    response_model=SkillMatchResponse,
)
async def match_skills(
    resume_hash: str,
    jd_hash: str,
    user_id: str = Depends(get_current_user_id),
):
    return await JDService().match_skills(
        user_id,
        resume_hash,
        jd_hash,
    )


# ============================================================
# INTERVIEW / QUIZ GENERATION
# ============================================================

@router.post(
    "/interviews/generate",
    response_model=GenerateInterviewResponse,
)
async def generate_interview(
    req: GenerateInterviewRequest,
    user_id: str = Depends(get_current_user_id),
):
    return await QuestionGenerationService().generate_interview(
        user_id,
        req,
    )


@router.post(
    "/quizzes/generate",
    response_model=GenerateQuizResponse,
)
async def generate_quiz(
    req: GenerateQuizRequest,
    user_id: str = Depends(get_current_user_id),
):
    return await QuestionGenerationService().generate_quiz(
        user_id,
        req,
    )


# ============================================================
# APTITUDE
# ============================================================

@router.get(
    "/aptitude",
    response_model=list[AptitudeQuestion],
)
async def get_aptitude(
    category: str | None = None,
    topic: str | None = None,
    difficulty: str | None = None,
    limit: int = Query(
        default=10,
        ge=1,
        le=50,
    ),
    user_id: str = Depends(get_current_user_id),
):
    response = await AptitudeService().get_questions(
        category=category,
        topic=topic,
        difficulty=difficulty,
        limit=limit,
    )

    return response.questions


@router.get(
    "/aptitude/topics",
    response_model=list[str],
)
async def get_aptitude_topics(
    category: str,
    user_id: str = Depends(get_current_user_id),
):
    return await AptitudeService().get_topics(
        category
    )


# ============================================================
# INTERVIEW SESSIONS
# ============================================================

@router.get(
    "/sessions",
    response_model=list[SessionResponse],
)
async def list_sessions(
    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),
    skip: int = Query(
        default=0,
        ge=0,
    ),
    user_id: str = Depends(get_current_user_id),
):
    return await SessionService().get_sessions(
        user_id,
        limit=limit,
        skip=skip,
    )


@router.post(
    "/sessions",
    response_model=SessionResponse,
)
async def create_session(
    req: CreateSessionRequest,
    user_id: str = Depends(get_current_user_id),
):
    return await SessionService().create_session(
        user_id,
        req,
    )


@router.post(
    "/sessions/{session_id}/answer",
    response_model=SubmitAnswerResponse,
)
async def submit_answer(
    session_id: str,
    req: SubmitAnswerRequest,
    user_id: str = Depends(get_current_user_id),
):
    return await SessionService().submit_answer(
        user_id,
        session_id,
        req,
    )
@router.post(
    "/sessions/{session_id}/answers",
    response_model=SubmitAnswerResponse,
)
async def submit_answer_plural(
    session_id: str,
    req: SubmitAnswerRequest,
    user_id: str = Depends(get_current_user_id),
):
    return await SessionService().submit_answer(
        user_id,
        session_id,
        req,
    )


@router.get(
    "/sessions/{session_id}",
    response_model=SessionResponse,
)
async def get_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    return await SessionService().get_session(
        user_id,
        session_id,
    )


@router.patch(
    "/sessions/{session_id}",
    response_model=SessionResponse,
)
async def finalize_session(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    return await SessionService().finalize_session(
        user_id,
        session_id,
    )


@router.get(
    "/sessions/{session_id}/stats",
    response_model=SessionStatsResponse,
)
async def get_session_stats(
    session_id: str,
    user_id: str = Depends(get_current_user_id),
):
    return await SessionService().get_session_stats(
        user_id,
        session_id,
    )


# ============================================================
# DASHBOARD
# ============================================================

@router.get(
    "/dashboard",
    response_model=DashboardMetrics,
)
async def get_dashboard(
    resume_hash: str | None = Query(
        default=None
    ),
    user_id: str = Depends(
        get_current_user_id
    ),
):
    return await SessionService().get_dashboard(
        user_id,
        resume_hash=resume_hash,
    )

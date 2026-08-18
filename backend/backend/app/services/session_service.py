from datetime import datetime
import re

from fastapi import HTTPException

from app.ai.ai_provider import get_ai_provider
from app.database import get_db
from app.schemas.common import GenerationSummary
from app.schemas.questions import InterviewQuestion
from app.schemas.sessions import (
    AnswerFeedback,
    CreateSessionRequest,
    DashboardMetrics,
    QuestionServed,
    SessionAnswer,
    SessionHistoryItem,
    SessionResponse,
    SessionStatsResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
)
from app.services.aptitude_service import AptitudeService
from app.utils.text import generate_id, utcnow


class SessionService:
    async def create_session(
        self,
        user_id: str,
        req: CreateSessionRequest
    ) -> SessionResponse:
        db = get_db()

        questions_served: list[QuestionServed] = []

        if req.questions:
            for q in req.questions:
                questions_served.append(
                    QuestionServed(
                        question_id=q.question_id,
                        question=q.question,
                        category=q.category,
                        source=q.source,
                        difficulty=q.difficulty,
                        skill_tag=q.skill_tag,
                        evidence=(
                            q.evidence.model_dump()
                            if q.evidence
                            else None
                        ),
                        options=q.options,
                        correct_answer=q.correct_answer,
                        why_asked=q.why_asked,
                        focus=q.focus,
                        suggested_answer=q.suggested_answer,
                    )
                )

        session_id = generate_id()

        cached_count = sum(
            1
            for q in questions_served
            if q.source == "cache"
        )

        fresh_count = sum(
            1
            for q in questions_served
            if q.source != "cache"
        )

        if req.generation_summary:
            cached_count = (
                req.generation_summary.cached_questions
            )

            fresh_count = (
                req.generation_summary.fresh_questions
            )

            gen_gemini = (
                req.generation_summary.gemini_requests_made
            )
        else:
            gen_gemini = 0

        doc = {
            "_id": session_id,
            "user_id": user_id,
            "resume_hash": req.resume_hash,
            "jd_hash": req.jd_hash,
            "mode": req.mode,
            "status": "in_progress",
            "current_question_index": 0,
            "questions_served": [
                q.model_dump()
                for q in questions_served
            ],
            "answers": [],
            "overall_score": None,
            "started_at": utcnow(),
            "completed_at": None,
            "metrics": {
                "cached_questions": cached_count,
                "fresh_questions": fresh_count,
                "gemini_requests": gen_gemini,
            },
        }

        await db.interview_sessions.insert_one(doc)

        return self._to_response(doc)

    async def get_session(
        self,
        user_id: str,
        session_id: str
    ) -> SessionResponse:
        doc = await self._get_user_session(
            user_id,
            session_id
        )

        return self._to_response(doc)

    async def finalize_session(
        self,
        user_id: str,
        session_id: str
    ) -> SessionResponse:
        doc = await self._get_user_session(
            user_id,
            session_id
        )

        if doc.get("status") == "completed":
            return self._to_response(doc)

        answers = doc.get(
            "answers",
            []
        )

        scores = [
            (
                a.get("ai_feedback") or {}
            ).get(
                "score",
                a.get("score", 0)
            )
            for a in answers
            if (
                (
                    a.get("ai_feedback") or {}
                ).get("score")
                is not None
                or a.get("score") is not None
            )
        ]

        average_score = (
            round(
                sum(scores) / len(scores),
                1
            )
            if scores
            else 0.0
        )

        completed_at = utcnow()

        doc["status"] = "completed"
        doc["overall_score"] = average_score
        doc["completed_at"] = completed_at

        db = get_db()

        await db.interview_sessions.update_one(
            {
                "_id": session_id,
                "user_id": user_id,
            },
            {
                "$set": {
                    "status": "completed",
                    "overall_score": average_score,
                    "completed_at": completed_at,
                }
            },
        )

        return self._to_response(doc)

    async def get_sessions(
        self,
        user_id: str,
        limit: int = 20,
        skip: int = 0
    ) -> list[SessionResponse]:
        db = get_db()

        cursor = (
            db.interview_sessions
            .find(
                {
                    "user_id": user_id
                }
            )
            .sort("started_at", -1)
            .skip(skip)
            .limit(limit)
        )

        docs = [
            doc
            async for doc in cursor
        ]

        return [
            self._to_response(doc)
            for doc in docs
        ]

    async def submit_answer(
        self,
        user_id: str,
        session_id: str,
        req: SubmitAnswerRequest,
    ) -> SubmitAnswerResponse:

        doc = await self._get_user_session(
            user_id,
            session_id
        )

        if doc["status"] == "completed":
            raise HTTPException(
                status_code=400,
                detail="Session already completed"
            )

        question = next(
            (
                q
                for q in doc["questions_served"]
                if q["question_id"]
                == req.question_id
            ),
            None,
        )

        if not question:
            raise HTTPException(
                status_code=404,
                detail="Question not found in session"
            )

        feedback = None
        is_correct = None
        score = None

        if doc["mode"] in (
            "quiz",
            "aptitude",
        ):
            correct_answer = question.get(
                "correct_answer"
            )

            if (
                not correct_answer
                and doc["mode"] == "aptitude"
            ):
                correct_answer = (
                    await self._lookup_aptitude_answer(
                        question.get(
                            "question_id"
                        )
                    )
                )

            is_correct = (
                req.user_answer
                .strip()
                .lower()
                ==
                (
                    correct_answer or ""
                )
                .strip()
                .lower()
            )

            score = (
                100.0
                if is_correct
                else 0.0
            )

            feedback = AnswerFeedback(
                score=score,
                strengths=(
                    ["Correct answer"]
                    if is_correct
                    else []
                ),
                weaknesses=(
                    []
                    if is_correct
                    else ["Incorrect answer"]
                ),
                missing_points=[],
                improvement_suggestions=[
                    question.get(
                        "suggested_answer",
                        ""
                    )
                ],
                ideal_answer=(
                    question.get(
                        "correct_answer"
                    )
                    or question.get(
                        "suggested_answer",
                        ""
                    )
                ),
            )

        else:
            feedback, ai_count = (
                await self._evaluate_answer(
                    question,
                    req.user_answer
                )
            )

            score = feedback.score

            db = get_db()

            await db.interview_sessions.update_one(
                {
                    "_id": session_id
                },
                {
                    "$inc": {
                        "metrics.gemini_requests":
                            ai_count
                    }
                },
            )

        answer = SessionAnswer(
            question_id=req.question_id,
            user_answer=req.user_answer,
            submitted_at=utcnow(),
            ai_feedback=feedback,
            score=score,
            is_correct=is_correct,
        )

        db = get_db()

        new_index = (
            doc["current_question_index"]
            + 1
        )

        total_q = len(
            doc["questions_served"]
        )

        status = (
            "completed"
            if new_index >= total_q
            else "in_progress"
        )

        update: dict = {
            "$push": {
                "answers":
                    answer.model_dump()
            },
            "$set": {
                "current_question_index":
                    new_index,
                "status":
                    status,
            },
        }

        if status == "completed":

            scores = [
                a.get("score")
                or (
                    a.get("ai_feedback")
                    or {}
                ).get("score", 0)
                for a in doc.get(
                    "answers",
                    []
                )
            ]

            scores.append(
                score or 0
            )

            avg = (
                sum(scores) / len(scores)
                if scores
                else 0
            )

            update["$set"][
                "overall_score"
            ] = round(
                avg,
                1
            )

            update["$set"][
                "completed_at"
            ] = utcnow()

        await db.interview_sessions.update_one(
            {
                "_id": session_id,
                "user_id": user_id,
            },
            update,
        )

        updated = (
            await self._get_user_session(
                user_id,
                session_id
            )
        )

        next_question = None

        if status != "completed":

            next_q = next(
                (
                    q
                    for i, q
                    in enumerate(
                        updated[
                            "questions_served"
                        ]
                    )
                    if i
                    >= updated[
                        "current_question_index"
                    ]
                ),
                None,
            )

            if next_q:
                next_question = (
                    QuestionServed(
                        **next_q
                    )
                )

        return SubmitAnswerResponse(
            feedback=feedback,
            is_correct=is_correct,
            follow_up_question=None,
            next_question=next_question,
            is_completed=(
                status == "completed"
            ),
            current_score=float(
                score or 0
            ),
            session=self._to_response(
                updated
            ),
        )

    async def get_session_stats(
        self,
        user_id: str,
        session_id: str
    ) -> SessionStatsResponse:
        doc = await self._get_user_session(
            user_id,
            session_id
        )

        return self._compute_stats(doc)

    # ==========================================================
    # DASHBOARD
    # ==========================================================
    #
    # resume_hash=None
    #     -> OVERALL performance for the entire user
    #
    # resume_hash=<hash>
    #     -> PERFORMANCE for only that resume
    #
    # This separation is important:
    #
    # activeResumeHash
    #     = resume used for future preparation
    #
    # resume_hash passed here
    #     = resume whose historical performance
    #       the user wants to inspect
    #
    # These do NOT have to be the same resume.
    # ==========================================================

    async def get_dashboard(
        self,
        user_id: str,
        resume_hash: str | None = None,
    ) -> DashboardMetrics:

        db = get_db()

        query = {
            "user_id": user_id
        }

        if resume_hash:
            query["resume_hash"] = resume_hash

        cursor = (
            db.interview_sessions
            .find(query)
            .sort("started_at", -1)
        )

        sessions = [
            session
            async for session in cursor
        ]

        if not sessions:
            return DashboardMetrics(
                total_sessions=0,
                questions_attempted=0,
                questions_completed=0,
                average_score=0,
                technical_score=0,
                hr_score=0,
                aptitude_score=0,
                quiz_score=0,
                accuracy=0,
                strong_skills=[],
                weak_skills=[],
                cache_hit_rate=0,
                cached_questions=0,
                fresh_questions=0,
                gemini_requests=0,
                session_history=[],
            )

        total_attempted = 0
        total_completed = 0

        all_scores: list[float] = []

        tech_scores: list[float] = []
        hr_scores: list[float] = []
        apt_scores: list[float] = []
        quiz_scores: list[float] = []

        cached_total = 0
        fresh_total = 0
        gemini_total = 0

        skill_scores: dict[
            str,
            list[float]
        ] = {}

        history: list[
            SessionHistoryItem
        ] = []

        for session in sessions:

            stats = self._compute_stats(
                session
            )

            total_attempted += (
                stats.questions_attempted
            )

            total_completed += (
                stats.questions_completed
            )

            if stats.average_score:
                all_scores.append(
                    stats.average_score
                )

            cached_total += (
                stats.cached_questions
            )

            fresh_total += (
                stats.fresh_questions
            )

            gemini_total += (
                stats.gemini_requests
            )

            if session["mode"] == "aptitude":

                if stats.average_score:
                    apt_scores.append(
                        stats.average_score
                    )

            elif session["mode"] == "quiz":

                if stats.average_score:
                    quiz_scores.append(
                        stats.average_score
                    )

            else:

                for answer in session.get(
                    "answers",
                    []
                ):

                    question = next(
                        (
                            q
                            for q
                            in session[
                                "questions_served"
                            ]
                            if q[
                                "question_id"
                            ]
                            == answer[
                                "question_id"
                            ]
                        ),
                        None,
                    )

                    if not question:
                        continue

                    category = (
                        question.get(
                            "category",
                            ""
                        )
                    )

                    score = (
                        (
                            answer.get(
                                "ai_feedback"
                            )
                            or {}
                        ).get(
                            "score",
                            answer.get(
                                "score",
                                0
                            )
                        )
                    )

                    if not isinstance(
                        score,
                        (int, float)
                    ):
                        continue

                    if category in (
                        "technical",
                        "problem_solving",
                        "jd_matched",
                    ):

                        tech_scores.append(
                            float(score)
                        )

                    elif category == "hr":

                        hr_scores.append(
                            float(score)
                        )

                    skill = question.get(
                        "skill_tag"
                    )

                    if skill:

                        skill_scores.setdefault(
                            skill,
                            []
                        ).append(
                            float(score)
                        )

        def avg(
            values: list[float]
        ) -> float:

            return (
                round(
                    sum(values)
                    / len(values),
                    1
                )
                if values
                else 0.0
            )

        strong = sorted(
            skill_scores,
            key=lambda skill:
                avg(
                    skill_scores[
                        skill
                    ]
                ),
            reverse=True,
        )[:5]

        weak = sorted(
            skill_scores,
            key=lambda skill:
                avg(
                    skill_scores[
                        skill
                    ]
                ),
        )[:5]

        total_questions_generated = (
            cached_total
            + fresh_total
        )

        hit_rate = (
            cached_total
            / total_questions_generated
            * 100
            if total_questions_generated
            else 0
        )

        for session in sessions:

            stats = self._compute_stats(
                session
            )

            started_value = session.get(
                "started_at"
            )

            started_dt = None

            if isinstance(
                started_value,
                str
            ):

                try:
                    started_dt = (
                        datetime.fromisoformat(
                            started_value
                        )
                    )

                except ValueError:
                    started_dt = None

            elif isinstance(
                started_value,
                datetime
            ):

                started_dt = (
                    started_value
                )

            history.append(
                SessionHistoryItem(
                    id=str(
                        session["_id"]
                    ),

                    session_id=str(
                        session["_id"]
                    ),

                    title=(
                        session.get(
                            "title"
                        )
                        or (
                            f"{(session.get('mode') or 'session').replace('_', ' ').title()} Session"
                        )
                    ),

                    date=(
                        started_dt.isoformat()
                        if started_dt
                        else (
                            started_value
                            if isinstance(
                                started_value,
                                str
                            )
                            else ""
                        )
                    ),

                    score=float(
                        session.get(
                            "overall_score"
                        )
                        if session.get(
                            "overall_score"
                        ) is not None
                        else
                        stats.average_score
                    ),

                    questions_attempted=(
                        stats.questions_attempted
                    ),

                    total_questions=(
                        len(
                            session.get(
                                "questions_served",
                                []
                            )
                        )
                        or
                        stats.questions_attempted
                        or
                        stats.questions_completed
                    ),

                    type=(
                        session.get(
                            "mode"
                        )
                        or
                        "unknown"
                    ),

                    mode=session.get(
                        "mode"
                    ),

                    status=session.get(
                        "status"
                    ),

                    overall_score=session.get(
                        "overall_score"
                    ),

                    started_at=started_dt,
                )
            )

        return DashboardMetrics(
            total_sessions=len(
                sessions
            ),

            questions_attempted=(
                total_attempted
            ),

            questions_completed=(
                total_completed
            ),

            average_score=avg(
                all_scores
            ),

            technical_score=avg(
                tech_scores
            ),

            hr_score=avg(
                hr_scores
            ),

            aptitude_score=avg(
                apt_scores
            ),

            quiz_score=avg(
                quiz_scores
            ),

            accuracy=avg(
                all_scores
            ),

            strong_skills=strong,

            weak_skills=weak,

            cache_hit_rate=round(
                hit_rate,
                1
            ),

            cached_questions=(
                cached_total
            ),

            fresh_questions=(
                fresh_total
            ),

            gemini_requests=(
                gemini_total
            ),

            session_history=history,
        )

    # ==========================================================
    # APTITUDE ANSWER LOOKUP
    # ==========================================================

    async def _lookup_aptitude_answer(
        self,
        question_id: str | None
    ) -> str | None:

        if not question_id:
            return None

        from bson import ObjectId
        from bson.errors import InvalidId

        db = get_db()

        try:
            doc = await db.aptitude_bank.find_one(
                {
                    "_id": ObjectId(
                        question_id
                    )
                }
            )

        except InvalidId:

            doc = await db.aptitude_bank.find_one(
                {
                    "question":
                        question_id
                }
            )

        if doc:
            return doc.get(
                "correct_answer"
            )

        return None

    # ==========================================================
    # ANSWER QUALITY CHECK
    # ==========================================================

    def _is_obviously_invalid_answer(
        self,
        user_answer: str,
    ) -> bool:
        """
        Detect obvious accidental or meaningless input.

        This check does not attempt to determine whether an answer
        is technically correct. It only catches clear gibberish.
        """

        text = " ".join(
            (user_answer or "").split()
        ).strip()

        if not text:
            return True

        alphanumeric = re.sub(
            r"[^A-Za-z0-9]+",
            "",
            text,
        )

        if not alphanumeric:
            return True

        normalized = re.sub(
            r"[^a-z0-9]+",
            "",
            text.lower(),
        )

        obvious_sequences = {
            "asdf",
            "asdfg",
            "asdfgh",
            "asdfghj",
            "asdfghjk",
            "asdfghjkl",
            "qwerty",
            "qwertyui",
            "qwertyuiop",
            "zxcv",
            "zxcvb",
            "zxcvbn",
            "zxcvbnm",
            "sdfgh",
            "sdfghj",
            "sdfghjk",
            "sdfghjkl",
        }

        if normalized in obvious_sequences:
            return True

        letters_only = bool(
            re.fullmatch(
                r"[A-Za-z]+",
                normalized,
            )
        )

        if (
            letters_only
            and len(normalized) >= 5
            and not re.search(
                r"[aeiou]",
                normalized,
            )
        ):
            return True

        if len(set(normalized)) == 1:
            return True

        return False

    def _build_invalid_answer_feedback(
        self,
        question: dict,
    ) -> AnswerFeedback:
        return AnswerFeedback(
            score=0.0,
            strengths=[],
            weaknesses=[
                "The submitted response does not provide "
                "a meaningful answer to the question."
            ],
            missing_points=[
                "A substantive explanation addressing "
                "the question was not provided."
            ],
            improvement_suggestions=[
                "Provide a direct answer that explains "
                "your approach, reasoning, or relevant "
                "technical concepts."
            ],
            ideal_answer=question.get(
                "suggested_answer",
                ""
            ),
        )

    # ==========================================================
    # AI ANSWER EVALUATION
    # ==========================================================

    async def _evaluate_answer(
        self,
        question: dict,
        user_answer: str
    ) -> tuple[
        AnswerFeedback,
        int
    ]:

        if self._is_obviously_invalid_answer(
            user_answer
        ):
            return (
                self._build_invalid_answer_feedback(
                    question
                ),
                0,
            )

        ai = get_ai_provider()

        if not ai.is_available:

            return (
                AnswerFeedback(
                    score=50.0,
                    strengths=[
                        "Answer submitted"
                    ],
                    weaknesses=[
                        "AI evaluation unavailable"
                    ],
                    missing_points=[],
                    improvement_suggestions=[
                        "Configure at least one AI provider "
                        "for detailed answer feedback"
                    ],
                    ideal_answer=
                        question.get(
                            "suggested_answer",
                            ""
                        ),
                ),
                0,
            )

        prompt = """
Evaluate the candidate's interview answer.

Return JSON:

{
  "score": 0-100,
  "strengths": ["..."],
  "weaknesses": ["..."],
  "missing_points": ["..."],
  "improvement_suggestions": ["..."],
  "ideal_answer": "..."
}

Rules:

1. Evaluate ONLY the candidate's actual answer.
2. Resume evidence is context only. It is not part of the candidate's answer.
3. The suggested answer is a reference for expected concepts only.
4. Never award credit for information found only in the resume,
   evidence, suggested answer, or question.
5. Give credit only for concepts actually expressed in the candidate answer.
6. Different wording is acceptable when the underlying concept is correct.
7. Do not infer missing content from the candidate's resume.
8. Do not assume knowledge merely because a skill appears in the resume.
9. Keep strengths specific to what the candidate actually stated.
10. If the answer is partially correct, give partial credit and identify
    what is missing.
11. If the answer is irrelevant but meaningful, score it low and explain why.
12. The score must be between 0 and 100.
13. Return ONLY valid JSON.
"""

        context = {
            "question":
                question.get(
                    "question"
                ),

            "suggested_answer":
                question.get(
                    "suggested_answer"
                ),

            "user_answer":
                user_answer,

            "evidence":
                question.get(
                    "evidence"
                ),
        }

        parsed, count = await ai.generate_json(
            prompt,
            context,
            task_type="answer_evaluation",
        )

        try:
            feedback = (
                AnswerFeedback.model_validate(
                    parsed
                )
            )
        except Exception as exc:
            raise HTTPException(
                status_code=502,
                detail=(
                    "Invalid AI answer evaluation response."
                ),
            ) from exc

        feedback.score = max(
            0.0,
            min(
                100.0,
                float(feedback.score),
            ),
        )

        return (
            feedback,
            count,
        )

    # ==========================================================
    # USER SESSION LOOKUP
    # ==========================================================

    async def _get_user_session(
        self,
        user_id: str,
        session_id: str
    ) -> dict:

        db = get_db()

        doc = await db.interview_sessions.find_one(
            {
                "_id": session_id,
                "user_id": user_id,
            }
        )

        if not doc:
            raise HTTPException(
                status_code=404,
                detail="Session not found"
            )

        return doc

    # ==========================================================
    # SESSION RESPONSE MAPPING
    # ==========================================================

    def _to_response(
        self,
        doc: dict
    ) -> SessionResponse:

        return SessionResponse(
            session_id=doc["_id"],

            user_id=doc["user_id"],

            resume_hash=
                doc["resume_hash"],

            jd_hash=
                doc.get("jd_hash"),

            mode=
                doc["mode"],

            status=
                doc["status"],

            current_question_index=
                doc[
                    "current_question_index"
                ],

            questions_served=[
                QuestionServed(**q)
                for q in doc.get(
                    "questions_served",
                    []
                )
            ],

            answers=[
                SessionAnswer(**a)
                for a in doc.get(
                    "answers",
                    []
                )
            ],

            overall_score=
                doc.get(
                    "overall_score"
                ),

            started_at=
                doc["started_at"],

            completed_at=
                doc.get(
                    "completed_at"
                ),

            title=
                doc.get(
                    "title"
                ),

            role=
                doc.get(
                    "role"
                ),

            difficulty=
                doc.get(
                    "difficulty"
                ),

            total_questions=
                len(
                    doc.get(
                        "questions_served",
                        []
                    )
                ),
        )

    # ==========================================================
    # SESSION STATISTICS
    # ==========================================================

    def _compute_stats(
        self,
        doc: dict
    ) -> SessionStatsResponse:

        answers = doc.get(
            "answers",
            []
        )

        scores = [
            (
                a.get(
                    "ai_feedback"
                )
                or {}
            ).get(
                "score",
                a.get(
                    "score",
                    0
                )
            )
            for a in answers
        ]

        avg = (
            round(
                sum(scores)
                / len(scores),
                1
            )
            if scores
            else 0
        )

        tech: list[float] = []
        hr: list[float] = []
        apt: list[float] = []
        quiz: list[float] = []

        for answer in answers:

            question = next(
                (
                    q
                    for q
                    in doc[
                        "questions_served"
                    ]
                    if q[
                        "question_id"
                    ]
                    ==
                    answer[
                        "question_id"
                    ]
                ),
                None,
            )

            score = (
                (
                    answer.get(
                        "ai_feedback"
                    )
                    or {}
                ).get(
                    "score",
                    answer.get(
                        "score",
                        0
                    )
                )
            )

            if not question:
                continue

            if doc["mode"] == "aptitude":

                apt.append(
                    float(score)
                )

            elif doc["mode"] == "quiz":

                quiz.append(
                    float(score)
                )

            elif (
                question.get(
                    "category"
                )
                == "hr"
            ):

                hr.append(
                    float(score)
                )

            else:

                tech.append(
                    float(score)
                )

        def average(
            values: list[float]
        ) -> float:

            return (
                round(
                    sum(values)
                    / len(values),
                    1
                )
                if values
                else 0.0
            )

        metrics = doc.get(
            "metrics",
            {}
        )

        cached = metrics.get(
            "cached_questions",
            0
        )

        fresh = metrics.get(
            "fresh_questions",
            0
        )

        total = (
            cached + fresh
        )

        hit_rate = (
            cached
            / total
            * 100
            if total
            else 0
        )

        return SessionStatsResponse(
            session_id=doc["_id"],

            questions_attempted=
                len(answers),

            questions_completed=
                len(answers),

            average_score=avg,

            technical_score=
                average(tech),

            hr_score=
                average(hr),

            aptitude_score=
                average(apt),

            quiz_score=
                average(quiz),

            accuracy=avg,

            strong_skills=[],

            weak_skills=[],

            cache_hit_rate=
                round(
                    hit_rate,
                    1
                ),

            cached_questions=
                cached,

            fresh_questions=
                fresh,

            gemini_requests=
                metrics.get(
                    "gemini_requests",
                    0
                ),

            generation_summary=(
                GenerationSummary(
                    questions_requested=
                        len(
                            doc[
                                "questions_served"
                            ]
                        ),

                    cached_questions=
                        cached,

                    fresh_questions=
                        fresh,

                    cache_hit_rate=
                        round(
                            hit_rate,
                            1
                        ),

                    gemini_requests_made=
                        metrics.get(
                            "gemini_requests",
                            0
                        ),
                )
                if total
                else None
            ),
        )
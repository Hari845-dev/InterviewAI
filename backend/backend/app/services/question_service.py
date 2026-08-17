import random
from typing import Any

from fastapi import HTTPException

from app.ai.gemini_orchestrator import get_gemini_orchestrator
from app.database import get_db
from app.schemas.common import GenerationSummary
from app.schemas.questions import (
    GenerateInterviewRequest,
    GenerateInterviewResponse,
    GenerateQuizRequest,
    GenerateQuizResponse,
    InterviewQuestion,
    QuestionDistribution,
)
from app.schemas.resume import StructuredProfile
from app.services.jd_service import JDService
from app.services.resume_service import ResumeService
from app.services.skill_normalization import get_skill_normalization_service
from app.utils.duplicate_detector import deduplicate_questions, is_duplicate
from app.utils.text import generate_id, utcnow


class QuestionGenerationService:
    def __init__(self) -> None:
        self.resume_svc = ResumeService()
        self.jd_svc = JDService()

    async def generate_interview(
        self, user_id: str, req: GenerateInterviewRequest
    ) -> GenerateInterviewResponse:
        profile = await self.resume_svc.get_profile(user_id, req.resume_hash)
        jd = None
        if req.jd_hash:
            jd = await self.jd_svc.get_structured_jd(user_id, req.jd_hash)

        dist = req.distribution or QuestionDistribution()
        slots = self._build_slots(dist, req.total_questions)
        cached: list[InterviewQuestion] = []
        missing_specs: list[dict] = []
        gemini_requests = 0

        for slot in slots:
            q = await self._try_cache(user_id, req.resume_hash, profile, slot, jd)
            if q:
                cached.append(q)
            else:
                missing_specs.append(slot)

        fresh: list[InterviewQuestion] = []
        if missing_specs:
            fresh, reqs = await self._batch_generate(
                user_id, req.resume_hash, profile, missing_specs, jd
            )
            gemini_requests += reqs

        all_q = deduplicate_questions([q.model_dump() for q in cached + fresh])
        questions = [InterviewQuestion(**q) for q in all_q[: req.total_questions]]

        total = len(questions)
        cached_count = sum(1 for q in questions if q.source == "cache")
        fresh_count = total - cached_count
        hit_rate = (cached_count / total * 100) if total else 0.0

        summary = GenerationSummary(
            questions_requested=req.total_questions,
            cached_questions=cached_count,
            fresh_questions=fresh_count,
            cache_hit_rate=round(hit_rate, 1),
            gemini_requests_made=gemini_requests,
        )

        return GenerateInterviewResponse(
            questions=questions,
            generation_summary=summary,
            resume_hash=req.resume_hash,
            jd_hash=req.jd_hash,
        )

    async def generate_quiz(
        self, user_id: str, req: GenerateQuizRequest
    ) -> GenerateQuizResponse:
        profile = await self.resume_svc.get_profile(user_id, req.resume_hash)
        skills = req.skills or profile.skills[:5]
        if not skills:
            raise HTTPException(status_code=400, detail="No skills available for quiz")

        cached: list[InterviewQuestion] = []
        missing_skills: list[str] = []
        db = get_db()

        for skill in skills:
            doc = await db.skill_question_bank.find_one({"skill_tag": skill, "category": "quiz"})
            if doc and doc.get("questions"):
                for q in doc["questions"]:
                    if req.difficulty and q.get("difficulty") != req.difficulty:
                        continue
                    iq = self._to_interview_question(q, "quiz", skill)
                    iq.source = "cache"
                    cached.append(iq)
                    if len(cached) >= req.total_questions:
                        break
            if len(cached) < req.total_questions:
                missing_skills.append(skill)
            if len(cached) >= req.total_questions:
                break

        gemini_requests = 0
        fresh: list[InterviewQuestion] = []
        need = req.total_questions - len(cached)
        if need > 0 and missing_skills:
            fresh, gemini_requests = await self._generate_quiz_batch(
                user_id, missing_skills[:need], need, req.difficulty
            )

        all_q = deduplicate_questions([q.model_dump() for q in cached + fresh])
        questions = [InterviewQuestion(**q) for q in all_q[: req.total_questions]]

        total = len(questions)
        cached_count = sum(1 for q in questions if q.source == "cache")
        fresh_count = total - cached_count
        hit_rate = (cached_count / total * 100) if total else 0.0

        return GenerateQuizResponse(
            questions=questions,
            generation_summary=GenerationSummary(
                questions_requested=req.total_questions,
                cached_questions=cached_count,
                fresh_questions=fresh_count,
                cache_hit_rate=round(hit_rate, 1),
                gemini_requests_made=gemini_requests,
            ),
        )

    def _build_slots(self, dist: QuestionDistribution, total: int) -> list[dict]:
        mapping = {
            "project": dist.project,
            "technical": dist.technical,
            "hr": dist.hr,
            "jd_matched": dist.jd_matched,
            "problem_solving": dist.problem_solving,
            "follow_up": dist.follow_up,
        }
        slots: list[dict] = []
        for cat, count in mapping.items():
            slots.extend([{"category": cat}] * count)
        if len(slots) < total:
            slots.extend([{"category": "technical"}] * (total - len(slots)))
        random.shuffle(slots)
        return slots[:total]

    async def _try_cache(
        self,
        user_id: str,
        resume_hash: str,
        profile: StructuredProfile,
        slot: dict,
        jd: Any,
    ) -> InterviewQuestion | None:
        category = slot["category"]
        db = get_db()

        if category in ("project", "experience", "follow_up"):
            bank_cat = "project" if category in ("project", "follow_up") else "experience"
            doc = await db.resume_question_bank.find_one(
                {"user_id": user_id, "resume_hash": resume_hash, "category": bank_cat}
            )
            if doc and doc.get("questions"):
                q = random.choice(doc["questions"])
                await self._increment_served(db.resume_question_bank, doc["_id"], q["question_id"])
                iq = self._to_interview_question(q, category, q.get("skill_tag"))
                iq.source = "cache"
                return iq

        if category in ("technical", "problem_solving", "jd_matched", "hr"):
            skills = profile.skills
            if category == "jd_matched" and jd:
                skills = jd.required_skills or skills
            if not skills:
                return None
            skill = random.choice(skills)
            bank_cat = "technical" if category != "hr" else "hr"
            doc = await db.skill_question_bank.find_one(
                {"skill_tag": skill, "category": bank_cat}
            )
            if doc and doc.get("questions"):
                q = random.choice(doc["questions"])
                await self._increment_served(db.skill_question_bank, doc["_id"], q["question_id"])
                iq = self._to_interview_question(q, category, skill)
                iq.source = "cache"
                iq.why_asked = self._build_why_asked(profile, jd, skill, category)
                return iq
        return None

    async def _increment_served(self, collection, doc_id, question_id: str) -> None:
        await collection.update_one(
            {"_id": doc_id, "questions.question_id": question_id},
            {"$inc": {"questions.$.times_served": 1}},
        )

    async def _batch_generate(
        self,
        user_id: str,
        resume_hash: str,
        profile: StructuredProfile,
        specs: list[dict],
        jd: Any,
    ) -> tuple[list[InterviewQuestion], int]:
        gemini = get_gemini_orchestrator()
        if not gemini.is_available:
            return self._seed_fallback_questions(profile, specs), 0

        prompt = f"""Generate exactly {len(specs)} interview questions.
For each question return:
{{
  "questions": [
    {{
      "category": "project|technical|hr|jd_matched|problem_solving|follow_up|experience",
      "difficulty": "easy|medium|hard",
      "question": "...",
      "suggested_answer": "...",
      "skill_tag": "optional",
      "linked_to": "project title if project question",
      "evidence": {{"source": "resume|skill_bank", "section": "...", "reference": "...", "snippet": "..."}},
      "why_asked": ["reason1", "reason2"],
      "focus": "topic focus"
    }}
  ]
}}
Ground every resume question in actual profile evidence. Categories needed: {[s['category'] for s in specs]}."""

        context = {"profile": profile.model_dump()}
        if jd:
            context["jd"] = jd.model_dump()

        parsed, reqs = await gemini.generate_json(prompt, context)
        raw_questions = parsed.get("questions", []) if isinstance(parsed, dict) else parsed
        if not isinstance(raw_questions, list):
            raw_questions = []

        existing_texts: list[str] = []
        results: list[InterviewQuestion] = []
        for raw in raw_questions[: len(specs)]:
            qid = generate_id()
            raw["question_id"] = qid
            raw["source"] = "gemini"
            if is_duplicate(raw.get("question", ""), existing_texts):
                continue
            existing_texts.append(raw.get("question", ""))
            await self._persist_generated(user_id, resume_hash, raw)
            results.append(self._to_interview_question(raw, raw.get("category", "technical")))

        return results, reqs

    async def _generate_quiz_batch(
        self, user_id: str, skills: list[str], count: int, difficulty: str | None
    ) -> tuple[list[InterviewQuestion], int]:
        gemini = get_gemini_orchestrator()
        if not gemini.is_available:
            return [], 0

        prompt = f"""Generate {count} multiple-choice quiz questions for skills: {skills}.
Return JSON:
{{"questions": [{{
  "question": "...",
  "options": ["A", "B", "C", "D"],
  "correct_answer": "exact option text",
  "suggested_answer": "explanation",
  "difficulty": "easy|medium|hard",
  "skill_tag": "skill",
  "evidence": {{"source": "skill_bank", "section": null, "reference": "skill", "snippet": null}}
}}]}}"""

        parsed, reqs = await gemini.generate_json(prompt)
        raw_questions = parsed.get("questions", []) if isinstance(parsed, dict) else []
        results: list[InterviewQuestion] = []
        db = get_db()
        for raw in raw_questions[:count]:
            if difficulty and raw.get("difficulty") != difficulty:
                continue
            qid = generate_id()
            raw["question_id"] = qid
            raw["source"] = "gemini"
            raw["category"] = "quiz"
            skill = raw.get("skill_tag") or skills[0]
            await db.skill_question_bank.update_one(
                {"skill_tag": skill, "category": "quiz"},
                {
                    "$push": {"questions": {**raw, "times_served": 0}},
                    "$set": {"updated_at": utcnow()},
                    "$setOnInsert": {"created_at": utcnow()},
                },
                upsert=True,
            )
            results.append(self._to_interview_question(raw, "quiz", skill))
        return results, reqs

    async def _persist_generated(self, user_id: str, resume_hash: str, raw: dict) -> None:
        db = get_db()
        category = raw.get("category", "technical")
        if category in ("project", "experience", "follow_up"):
            bank_cat = "project" if category in ("project", "follow_up") else "experience"
            await db.resume_question_bank.update_one(
                {"user_id": user_id, "resume_hash": resume_hash, "category": bank_cat},
                {
                    "$push": {"questions": {**raw, "times_served": 0}},
                    "$set": {"updated_at": utcnow()},
                    "$setOnInsert": {"user_id": user_id, "resume_hash": resume_hash, "created_at": utcnow()},
                },
                upsert=True,
            )
        else:
            skill = raw.get("skill_tag") or "general"
            bank_cat = "hr" if category == "hr" else "technical"
            await db.skill_question_bank.update_one(
                {"skill_tag": skill, "category": bank_cat},
                {
                    "$push": {"questions": {**raw, "times_served": 0}},
                    "$set": {"updated_at": utcnow()},
                    "$setOnInsert": {"created_at": utcnow()},
                },
                upsert=True,
            )

    def _to_interview_question(
        self, raw: dict, category: str, skill_tag: str | None = None
    ) -> InterviewQuestion:
        evidence = raw.get("evidence") or {
            "source": "skill_bank",
            "section": None,
            "reference": skill_tag or raw.get("skill_tag") or "general",
            "snippet": None,
        }
        return InterviewQuestion(
            question_id=raw.get("question_id", generate_id()),
            category=category,
            difficulty=raw.get("difficulty", "medium"),
            question=raw.get("question", ""),
            suggested_answer=raw.get("suggested_answer", ""),
            skill_tag=skill_tag or raw.get("skill_tag"),
            evidence=evidence,
            source=raw.get("source", "cache"),
            linked_to=raw.get("linked_to"),
            options=raw.get("options"),
            correct_answer=raw.get("correct_answer"),
            why_asked=raw.get("why_asked", []),
            focus=raw.get("focus"),
        )

    def _build_why_asked(self, profile, jd, skill: str, category: str) -> list[str]:
        reasons = []
        if skill in profile.skills:
            reasons.append(f"Your resume mentions {skill}")
        for p in profile.projects:
            if skill in p.tech_stack:
                reasons.append(f"Your project '{p.title}' uses {skill}")
        if jd and skill in jd.required_skills:
            reasons.append(f"The target role requires {skill}")
        if category == "problem_solving":
            reasons.append("Problem-solving assesses analytical ability")
        return reasons[:4]

    def _seed_fallback_questions(
        self, profile: StructuredProfile, specs: list[dict]
    ) -> list[InterviewQuestion]:
        results = []
        for i, spec in enumerate(specs):
            skill = profile.skills[i % len(profile.skills)] if profile.skills else "general"
            results.append(
                InterviewQuestion(
                    question_id=generate_id(),
                    category=spec["category"],
                    difficulty="medium",
                    question=f"Explain your experience with {skill}.",
                    suggested_answer=f"Discuss practical use of {skill}.",
                    skill_tag=skill,
                    evidence={
                        "source": "skill_bank",
                        "section": None,
                        "reference": skill,
                        "snippet": None,
                    },
                    source="seed",
                    why_asked=[f"Your resume lists {skill}"],
                )
            )
        return results

from app.database import get_db
from app.utils.text import utcnow


async def ensure_indexes() -> None:
    db = get_db()

    await db.users.create_index("email", unique=True)

    await db.resume_profiles.create_index(
        [("user_id", 1), ("resume_hash", 1)], unique=True
    )
    await db.resume_profiles.create_index("resume_hash")
    await db.resume_profiles.create_index("structured_profile.skills")

    await db.resume_question_bank.create_index(
        [("user_id", 1), ("resume_hash", 1), ("category", 1)]
    )

    await db.skill_question_bank.create_index(
        [("skill_tag", 1), ("category", 1)], unique=True
    )

    await db.aptitude_bank.create_index([("category", 1), ("difficulty", 1)])
    await db.aptitude_bank.create_index("question", unique=True)

    await db.skill_aliases.create_index("raw", unique=True)

    await db.jd_profiles.create_index([("user_id", 1), ("jd_hash", 1)], unique=True)

    await db.interview_sessions.create_index([("user_id", 1), ("resume_hash", 1)])
    await db.interview_sessions.create_index([("started_at", -1)])

    await db.gemini_key_state.create_index("key_id", unique=True)

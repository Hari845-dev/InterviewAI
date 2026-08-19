from app.database import get_db


async def ensure_indexes() -> None:
    db = get_db()

    await db.users.create_index(
        "email",
        unique=True,
    )

    await db.resume_profiles.create_index(
        [
            ("user_id", 1),
            ("resume_hash", 1),
        ],
        unique=True,
    )

    await db.resume_profiles.create_index(
        "resume_hash"
    )

    await db.resume_profiles.create_index(
        "structured_profile.skills"
    )

    await db.resume_question_bank.create_index(
        [
            ("user_id", 1),
            ("resume_hash", 1),
            ("category", 1),
        ]
    )

    await db.skill_question_bank.create_index(
        [
            ("skill_tag", 1),
            ("category", 1),
        ],
        unique=True,
    )

    await db.aptitude_bank.create_index(
        [
            ("category", 1),
            ("difficulty", 1),
        ]
    )

    await db.aptitude_bank.create_index(
        "question",
        unique=True,
    )

    await db.skill_aliases.create_index(
        "raw",
        unique=True,
    )

    # ----------------------------------------------------------
    # JOB DESCRIPTION INDEX
    # ----------------------------------------------------------
    #
    # Older deployments may still contain:
    #
    #     jd_hash_1
    #
    # which makes jd_hash globally unique.
    #
    # InterviewAI requires JD uniqueness per user:
    #
    #     user_id + jd_hash
    #
    # Remove the old global index before creating the
    # correct compound unique index.
    # ----------------------------------------------------------

    try:
        await db.jd_profiles.drop_index(
            "jd_hash_1"
        )
    except Exception:
        pass

    await db.jd_profiles.create_index(
        [
            ("user_id", 1),
            ("jd_hash", 1),
        ],
        unique=True,
        name="user_id_jd_hash_unique",
    )

    await db.interview_sessions.create_index(
        [
            ("user_id", 1),
            ("resume_hash", 1),
        ]
    )

    await db.interview_sessions.create_index(
        [
            ("started_at", -1),
        ]
    )

    await db.gemini_key_state.create_index(
        "key_id",
        unique=True,
    )
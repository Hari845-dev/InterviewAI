import random

from fastapi import HTTPException

from app.database import get_db
from app.schemas.questions import AptitudeQuestion, AptitudeResponse
from app.utils.text import generate_id


class AptitudeService:

    # ==========================================================
    # GET APTITUDE QUESTIONS
    # ==========================================================

    async def get_questions(
        self,
        category: str | None = None,
        topic: str | None = None,
        difficulty: str | None = None,
        limit: int = 10,
    ) -> AptitudeResponse:

        db = get_db()

        query: dict = {}

        # ------------------------------------------------------
        # CATEGORY FILTER
        # ------------------------------------------------------

        if category:
            query["category"] = category.lower().strip()

        # ------------------------------------------------------
        # TOPIC FILTER
        # ------------------------------------------------------

        if topic:
            query["topic"] = topic.lower().strip()

        # ------------------------------------------------------
        # DIFFICULTY FILTER
        # ------------------------------------------------------

        if difficulty:
            query["difficulty"] = (
                difficulty.lower().strip()
            )

        # ------------------------------------------------------
        # CHECK QUESTION COUNT
        # ------------------------------------------------------

        count = await db.aptitude_bank.count_documents(
            query
        )

        if count == 0:
            raise HTTPException(
                status_code=404,
                detail="No aptitude questions found for the selected filters.",
            )

        # ------------------------------------------------------
        # RANDOM QUESTION SELECTION
        # ------------------------------------------------------

        pipeline = [
            {
                "$match": query
            },
            {
                "$sample": {
                    "size": min(
                        limit,
                        count,
                    )
                }
            },
        ]

        cursor = db.aptitude_bank.aggregate(
            pipeline
        )

        questions: list[AptitudeQuestion] = []

        async for doc in cursor:

            questions.append(
                AptitudeQuestion(
                    question_id=str(
                        doc.get(
                            "_id",
                            generate_id(),
                        )
                    ),
                    category=str(
                        doc.get(
                            "category",
                            "",
                        )
                    ),
                    topic=str(
                        doc.get(
                            "topic",
                            "general",
                        )
                    ),
                    difficulty=str(
                        doc.get(
                            "difficulty",
                            "medium",
                        )
                    ),
                    question=str(
                        doc.get(
                            "question",
                            "",
                        )
                    ),
                    options=[
                        str(option)
                        for option in (
                            doc.get(
                                "options",
                                [],
                            )
                            or []
                        )
                    ],
                    correct_answer=(
                        str(
                            doc["correct_answer"]
                        )
                        if doc.get(
                            "correct_answer"
                        )
                        is not None
                        else None
                    ),
                    explanation=str(
                        doc.get(
                            "explanation",
                            "",
                        )
                    ),
                )
            )

        return AptitudeResponse(
            questions=questions,
            total=len(questions),
        )

    # ==========================================================
    # GET AVAILABLE TOPICS
    # ==========================================================

    async def get_topics(
        self,
        category: str,
    ) -> list[str]:

        db = get_db()

        normalized_category = (
            category.lower().strip()
        )

        # ------------------------------------------------------
        # MIXED / ALL
        #
        # There is no single topic selector for
        # the comprehensive assessment.
        # ------------------------------------------------------

        if normalized_category in {
            "all",
            "mixed",
            "comprehensive",
        }:
            return []

        # ------------------------------------------------------
        # GET DISTINCT TOPICS FROM MONGODB
        # ------------------------------------------------------

        topics = await db.aptitude_bank.distinct(
            "topic",
            {
                "category": normalized_category,
            },
        )

        # ------------------------------------------------------
        # CLEAN / SORT TOPICS
        # ------------------------------------------------------

        cleaned_topics = sorted(
            {
                str(topic).strip()
                for topic in topics
                if topic
                and str(topic).strip()
            }
        )

        return cleaned_topics

    # ==========================================================
    # COUNT TOTAL QUESTIONS
    # ==========================================================

    async def count(self) -> int:
        db = get_db()

        return await db.aptitude_bank.count_documents(
            {}
        )
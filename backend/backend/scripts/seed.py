"""One-time seed script — safe to rerun (uses upsert / duplicate checks)."""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from motor.motor_asyncio import AsyncIOMotorClient

from app.config.settings import get_settings
from app.repositories.indexes import ensure_indexes
from app.utils.text import utcnow


SKILL_ALIASES = [
    ("reactjs", "react"),
    ("react.js", "react"),
    ("node.js", "node"),
    ("nodejs", "node"),
    ("py", "python"),
    ("python3", "python"),
    ("js", "javascript"),
    ("ts", "typescript"),
    ("postgresql", "postgres"),
    ("mongo", "mongodb"),
    ("k8s", "kubernetes"),
    ("ml", "machine learning"),
    ("ai", "artificial intelligence"),
    ("aws cloud", "aws"),
    ("gcp", "google cloud"),
    ("tf", "tensorflow"),
    ("sklearn", "scikit-learn"),
    ("cpp", "c++"),
    ("csharp", "c#"),
    ("flaskapi", "flask"),
    ("fast api", "fastapi"),
    ("nextjs", "next.js"),
    ("vuejs", "vue"),
    ("angularjs", "angular"),
    ("sql server", "sql"),
    ("html5", "html"),
    ("css3", "css"),
    ("restapi", "rest"),
    ("graphqlapi", "graphql"),
    ("redis cache", "redis"),
]


SEED_SKILL_QUESTIONS = [
    {
        "skill_tag": "python",
        "category": "technical",
        "questions": [
            {
                "question_id": "py-t-1",
                "question": "What is the difference between a list and a tuple in Python?",
                "suggested_answer": "Lists are mutable, tuples are immutable. Tuples can be used as dict keys.",
                "difficulty": "easy",
                "evidence": {
                    "source": "skill_bank",
                    "section": None,
                    "reference": "python",
                    "snippet": None,
                },
                "source": "seed",
                "times_served": 0,
            },
            {
                "question_id": "py-t-2",
                "question": "Explain Python's GIL and its impact on multithreading.",
                "suggested_answer": "The Global Interpreter Lock allows only one thread to execute Python bytecode at a time.",
                "difficulty": "hard",
                "evidence": {
                    "source": "skill_bank",
                    "section": None,
                    "reference": "python",
                    "snippet": None,
                },
                "source": "seed",
                "times_served": 0,
            },
        ],
    },
    {
        "skill_tag": "react",
        "category": "technical",
        "questions": [
            {
                "question_id": "react-t-1",
                "question": "What is React reconciliation and how does the virtual DOM help?",
                "suggested_answer": "Reconciliation is the process of updating the DOM by diffing virtual DOM trees.",
                "difficulty": "medium",
                "evidence": {
                    "source": "skill_bank",
                    "section": None,
                    "reference": "react",
                    "snippet": None,
                },
                "source": "seed",
                "times_served": 0,
            },
        ],
    },
    {
        "skill_tag": "python",
        "category": "quiz",
        "questions": [
            {
                "question_id": "py-q-1",
                "question": "Which of the following is immutable in Python?",
                "suggested_answer": "Tuple is immutable.",
                "difficulty": "easy",
                "options": [
                    "List",
                    "Dictionary",
                    "Set",
                    "Tuple",
                ],
                "correct_answer": "Tuple",
                "evidence": {
                    "source": "skill_bank",
                    "section": None,
                    "reference": "python",
                    "snippet": None,
                },
                "source": "seed",
                "times_served": 0,
            },
        ],
    },
    {
        "skill_tag": "general",
        "category": "hr",
        "questions": [
            {
                "question_id": "hr-1",
                "question": "Tell me about a time you solved a conflict within a team.",
                "suggested_answer": "Use STAR method: Situation, Task, Action, Result with measurable outcome.",
                "difficulty": "medium",
                "evidence": {
                    "source": "skill_bank",
                    "section": None,
                    "reference": "behavioral",
                    "snippet": None,
                },
                "source": "seed",
                "times_served": 0,
            },
        ],
    },
]


def generate_aptitude_questions() -> list[dict]:
    """
    Generate the aptitude bank.

    Every aptitude question now has:
      - category
      - topic
      - difficulty
      - question
      - options
      - correct_answer
      - explanation
    """

    questions: list[dict] = []

    # ==========================================================
    # QUANTITATIVE — ARITHMETIC
    # ==========================================================

    for i in range(1, 31):
        a, b = i * 3, i * 7
        correct = a + b

        questions.append(
            {
                "category": "quantitative",
                "topic": "arithmetic",
                "difficulty": "easy",
                "question": f"What is {a} + {b}?",
                "options": [
                    str(correct),
                    str(correct + 5),
                    str(correct - 3),
                    str(correct + 10),
                ],
                "correct_answer": str(correct),
                "explanation": f"{a} + {b} = {correct}",
            }
        )

    # ==========================================================
    # QUANTITATIVE — PERCENTAGES
    # ==========================================================

    for i in range(1, 31):
        pct = i * 5
        base = 200
        correct = round(base * pct / 100)

        questions.append(
            {
                "category": "quantitative",
                "topic": "percentages",
                "difficulty": "medium",
                "question": f"What is {pct}% of {base}?",
                "options": [
                    str(correct),
                    str(correct + 10),
                    str(correct - 5),
                    str(correct + 20),
                ],
                "correct_answer": str(correct),
                "explanation": f"{pct}% of {base} = {correct}",
            }
        )

    # ==========================================================
    # QUANTITATIVE — NUMBER SYSTEM
    # ==========================================================

    for i in range(2, 22):
        correct = i * i

        questions.append(
            {
                "category": "quantitative",
                "topic": "number_system",
                "difficulty": "hard",
                "question": f"What is {i} squared?",
                "options": [
                    str(correct),
                    str(correct + i),
                    str(correct - 1),
                    str(correct + 2),
                ],
                "correct_answer": str(correct),
                "explanation": f"{i}² = {correct}",
            }
        )

    # ==========================================================
    # QUANTITATIVE — ADDITIONAL ARITHMETIC
    # ==========================================================

    for i in range(1, 41):
        a, b = i * 11, i * 4
        correct = a - b

        questions.append(
            {
                "category": "quantitative",
                "topic": "arithmetic",
                "difficulty": "medium",
                "question": f"What is {a} minus {b}?",
                "options": [
                    str(correct),
                    str(correct + 7),
                    str(correct - 4),
                    str(correct + 12),
                ],
                "correct_answer": str(correct),
                "explanation": f"{a} - {b} = {correct}",
            }
        )

    for i in range(2, 42):
        correct = i * 6

        questions.append(
            {
                "category": "quantitative",
                "topic": "arithmetic",
                "difficulty": "easy",
                "question": f"What is {i} multiplied by 6?",
                "options": [
                    str(correct),
                    str(correct + 6),
                    str(correct - 6),
                    str(correct + 3),
                ],
                "correct_answer": str(correct),
                "explanation": f"{i} × 6 = {correct}",
            }
        )

    # ==========================================================
    # LOGICAL — NUMBER SERIES
    # ==========================================================

    for idx in range(1, 91):
        start = idx

        seq = [
            start,
            start + 3,
            start + 6,
            start + 9,
        ]

        correct = str(
            start + 12
        )

        wrongs = [
            str(start + 10),
            str(start + 14),
            str(start + 11),
        ]

        diff = [
            "easy",
            "medium",
            "hard",
        ][idx % 3]

        questions.append(
            {
                "category": "logical",
                "topic": "number_series",
                "difficulty": diff,
                "question": (
                    "What comes next in the sequence: "
                    f"{', '.join(map(str, seq))}, ?"
                ),
                "options": [
                    correct,
                    *wrongs,
                ],
                "correct_answer": correct,
                "explanation": (
                    "The pattern increases by 3, "
                    f"so the next term is {correct}."
                ),
            }
        )

    # ==========================================================
    # VERBAL — SYNONYMS
    # ==========================================================

    synonyms = [
        (
            "Abundant",
            "Plentiful",
            "Scarce",
            "Tiny",
            "Weak",
        ),
        (
            "Benevolent",
            "Kind",
            "Cruel",
            "Silent",
            "Rapid",
        ),
        (
            "Concise",
            "Brief",
            "Lengthy",
            "Noisy",
            "Heavy",
        ),
        (
            "Diligent",
            "Hardworking",
            "Lazy",
            "Careless",
            "Slow",
        ),
        (
            "Eloquent",
            "Articulate",
            "Mute",
            "Clumsy",
            "Faint",
        ),
        (
            "Frugal",
            "Thrifty",
            "Wasteful",
            "Loud",
            "Proud",
        ),
        (
            "Gregarious",
            "Sociable",
            "Shy",
            "Angry",
            "Timid",
        ),
        (
            "Humble",
            "Modest",
            "Arrogant",
            "Bold",
            "Rude",
        ),
        (
            "Impartial",
            "Neutral",
            "Biased",
            "Eager",
            "Hasty",
        ),
        (
            "Jubilant",
            "Joyful",
            "Gloomy",
            "Calm",
            "Tired",
        ),
    ]

    for (
        word,
        correct,
        w1,
        w2,
        w3,
    ) in synonyms:

        questions.append(
            {
                "category": "verbal",
                "topic": "vocabulary",
                "difficulty": "easy",
                "question": (
                    f"Choose the synonym of '{word}':"
                ),
                "options": [
                    correct,
                    w1,
                    w2,
                    w3,
                ],
                "correct_answer": correct,
                "explanation": (
                    f"{word} means "
                    f"{correct.lower()}."
                ),
            }
        )

    # ==========================================================
    # VERBAL — ANTONYMS
    # ==========================================================

    antonyms = [
        (
            "Ancient",
            "Modern",
            "Old",
            "Historic",
            "Classic",
        ),
        (
            "Bold",
            "Timid",
            "Brave",
            "Strong",
            "Firm",
        ),
        (
            "Complex",
            "Simple",
            "Hard",
            "Detailed",
            "Rich",
        ),
        (
            "Expand",
            "Contract",
            "Grow",
            "Spread",
            "Extend",
        ),
        (
            "Generous",
            "Stingy",
            "Kind",
            "Open",
            "Free",
        ),
    ]

    for (
        word,
        correct,
        w1,
        w2,
        w3,
    ) in antonyms:

        questions.append(
            {
                "category": "verbal",
                "topic": "vocabulary",
                "difficulty": "medium",
                "question": (
                    f"Choose the antonym of '{word}':"
                ),
                "options": [
                    correct,
                    w1,
                    w2,
                    w3,
                ],
                "correct_answer": correct,
                "explanation": (
                    f"The opposite of "
                    f"{word.lower()} is "
                    f"{correct.lower()}."
                ),
            }
        )

    # ==========================================================
    # VERBAL — ANALOGIES
    # ==========================================================

    analogies = [
        (
            "Doctor is to Hospital as Teacher is to ___",
            "School",
            "Student",
            "Book",
            "Class",
        ),
        (
            "Pen is to Write as Knife is to ___",
            "Cut",
            "Sharp",
            "Kitchen",
            "Metal",
        ),
        (
            "Bird is to Fly as Fish is to ___",
            "Swim",
            "Water",
            "Scale",
            "Ocean",
        ),
        (
            "Chapter is to Book as Scene is to ___",
            "Play",
            "Actor",
            "Stage",
            "Script",
        ),
        (
            "Engine is to Car as Heart is to ___",
            "Body",
            "Blood",
            "Beat",
            "Life",
        ),
    ]

    for (
        question,
        correct,
        w1,
        w2,
        w3,
    ) in analogies:

        questions.append(
            {
                "category": "verbal",
                "topic": "verbal_analogy",
                "difficulty": "hard",
                "question": question,
                "options": [
                    correct,
                    w1,
                    w2,
                    w3,
                ],
                "correct_answer": correct,
                "explanation": (
                    f"Analogy completes with "
                    f"{correct}."
                ),
            }
        )

    # ==========================================================
    # TOPIC-SPECIFIC HAND-AUTHORED QUESTIONS
    # ==========================================================

    topic_questions = [
        # ------------------------------------------------------
        # PERCENTAGES
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "percentages",
            "difficulty": "easy",
            "question": (
                "A shirt costs ₹500. If the price increases "
                "by 10%, what is the new price?"
            ),
            "options": [
                "₹510",
                "₹550",
                "₹600",
                "₹650",
            ],
            "correct_answer": "₹550",
            "explanation": (
                "10% of ₹500 is ₹50. "
                "Therefore, the new price is ₹550."
            ),
        },
        {
            "category": "quantitative",
            "topic": "percentages",
            "difficulty": "medium",
            "question": (
                "A student's marks increase from 60 to 75. "
                "What is the percentage increase?"
            ),
            "options": [
                "20%",
                "25%",
                "30%",
                "15%",
            ],
            "correct_answer": "25%",
            "explanation": (
                "Increase = 15. "
                "15 / 60 × 100 = 25%."
            ),
        },
        {
            "category": "quantitative",
            "topic": "percentages",
            "difficulty": "hard",
            "question": (
                "A number is increased by 20% and then "
                "decreased by 20%. What is the net percentage change?"
            ),
            "options": [
                "0%",
                "4% decrease",
                "4% increase",
                "2% decrease",
            ],
            "correct_answer": "4% decrease",
            "explanation": (
                "Using 100 as the starting value gives "
                "120 and then 96. Therefore the net change is 4% decrease."
            ),
        },

        # ------------------------------------------------------
        # PROFIT & LOSS
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "profit_loss",
            "difficulty": "easy",
            "question": (
                "An item is bought for ₹800 and sold for ₹1,000. "
                "What is the profit?"
            ),
            "options": [
                "₹100",
                "₹150",
                "₹200",
                "₹250",
            ],
            "correct_answer": "₹200",
            "explanation": (
                "Profit = Selling Price − Cost Price = ₹200."
            ),
        },
        {
            "category": "quantitative",
            "topic": "profit_loss",
            "difficulty": "medium",
            "question": (
                "An article costing ₹500 is sold for ₹575. "
                "What is the profit percentage?"
            ),
            "options": [
                "10%",
                "12%",
                "15%",
                "20%",
            ],
            "correct_answer": "15%",
            "explanation": (
                "Profit = ₹75. "
                "Profit percentage = 75 / 500 × 100 = 15%."
            ),
        },

        # ------------------------------------------------------
        # RATIO & PROPORTION
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "ratio_proportion",
            "difficulty": "easy",
            "question": (
                "The ratio of boys to girls in a class is 2:3. "
                "If there are 20 boys, how many girls are there?"
            ),
            "options": [
                "25",
                "30",
                "35",
                "40",
            ],
            "correct_answer": "30",
            "explanation": (
                "2 parts correspond to 20, so one part is 10. "
                "Three parts correspond to 30 girls."
            ),
        },
        {
            "category": "quantitative",
            "topic": "ratio_proportion",
            "difficulty": "medium",
            "question": (
                "If A:B = 3:5 and B:C = 10:7, what is A:C?"
            ),
            "options": [
                "3:7",
                "6:7",
                "5:7",
                "6:5",
            ],
            "correct_answer": "6:7",
            "explanation": (
                "Make B common: 3:5 becomes 6:10. "
                "Therefore A:C = 6:7."
            ),
        },

        # ------------------------------------------------------
        # AVERAGES
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "average",
            "difficulty": "easy",
            "question": (
                "What is the average of 10, 20, 30, 40 and 50?"
            ),
            "options": [
                "25",
                "30",
                "35",
                "40",
            ],
            "correct_answer": "30",
            "explanation": (
                "Sum = 150. "
                "Average = 150 / 5 = 30."
            ),
        },
        {
            "category": "quantitative",
            "topic": "average",
            "difficulty": "medium",
            "question": (
                "The average of 6 numbers is 24. "
                "If one number is removed, the average of the remaining "
                "5 is 22. What number was removed?"
            ),
            "options": [
                "30",
                "32",
                "34",
                "36",
            ],
            "correct_answer": "34",
            "explanation": (
                "Total of 6 = 144. "
                "Total of remaining 5 = 110. "
                "Removed number = 34."
            ),
        },

        # ------------------------------------------------------
        # TIME & WORK
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "time_work",
            "difficulty": "easy",
            "question": (
                "A worker completes a job in 10 days. "
                "What fraction of the job does the worker complete each day?"
            ),
            "options": [
                "1/5",
                "1/10",
                "1/15",
                "1/20",
            ],
            "correct_answer": "1/10",
            "explanation": (
                "Daily work rate = 1 / 10."
            ),
        },
        {
            "category": "quantitative",
            "topic": "time_work",
            "difficulty": "medium",
            "question": (
                "A can complete a job in 6 days and B can complete it "
                "in 12 days. How long will they take together?"
            ),
            "options": [
                "3 days",
                "4 days",
                "5 days",
                "6 days",
            ],
            "correct_answer": "4 days",
            "explanation": (
                "Combined rate = 1/6 + 1/12 = 1/4. "
                "Therefore they need 4 days."
            ),
        },

        # ------------------------------------------------------
        # SPEED, TIME & DISTANCE
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "speed_distance",
            "difficulty": "easy",
            "question": (
                "A car travels 120 km in 2 hours. "
                "What is its average speed?"
            ),
            "options": [
                "40 km/h",
                "50 km/h",
                "60 km/h",
                "80 km/h",
            ],
            "correct_answer": "60 km/h",
            "explanation": (
                "Speed = Distance / Time = 120 / 2 = 60 km/h."
            ),
        },
        {
            "category": "quantitative",
            "topic": "speed_distance",
            "difficulty": "medium",
            "question": (
                "A train travels at 72 km/h. "
                "How far will it travel in 25 seconds?"
            ),
            "options": [
                "400 m",
                "450 m",
                "500 m",
                "550 m",
            ],
            "correct_answer": "500 m",
            "explanation": (
                "72 km/h = 20 m/s. "
                "Distance = 20 × 25 = 500 m."
            ),
        },

        # ------------------------------------------------------
        # SIMPLE & COMPOUND INTEREST
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "simple_compound_interest",
            "difficulty": "easy",
            "question": (
                "What is the simple interest on ₹1,000 at 10% per annum for 2 years?"
            ),
            "options": [
                "₹100",
                "₹150",
                "₹200",
                "₹250",
            ],
            "correct_answer": "₹200",
            "explanation": (
                "SI = P × R × T / 100 = ₹200."
            ),
        },
        {
            "category": "quantitative",
            "topic": "simple_compound_interest",
            "difficulty": "medium",
            "question": (
                "What is the amount on ₹1,000 at 10% compound interest for 2 years?"
            ),
            "options": [
                "₹1,100",
                "₹1,200",
                "₹1,210",
                "₹1,220",
            ],
            "correct_answer": "₹1,210",
            "explanation": (
                "Amount = 1000 × (1.10)^2 = ₹1,210."
            ),
        },

        # ------------------------------------------------------
        # PROBABILITY
        # ------------------------------------------------------

        {
            "category": "quantitative",
            "topic": "probability",
            "difficulty": "easy",
            "question": (
                "What is the probability of getting a head "
                "when a fair coin is tossed once?"
            ),
            "options": [
                "0",
                "1/4",
                "1/2",
                "1",
            ],
            "correct_answer": "1/2",
            "explanation": (
                "There are 2 equally likely outcomes and 1 favorable outcome."
            ),
        },
        {
            "category": "quantitative",
            "topic": "probability",
            "difficulty": "medium",
            "question": (
                "What is the probability of rolling a 6 on a fair six-sided die?"
            ),
            "options": [
                "1/2",
                "1/3",
                "1/6",
                "1/12",
            ],
            "correct_answer": "1/6",
            "explanation": (
                "There is one favorable outcome out of six equally likely outcomes."
            ),
        },

        # ------------------------------------------------------
        # LOGICAL — CODING DECODING
        # ------------------------------------------------------

        {
            "category": "logical",
            "topic": "coding_decoding",
            "difficulty": "easy",
            "question": (
                "If CAT is coded as DBU, how is DOG coded using the same pattern?"
            ),
            "options": [
                "EPH",
                "EPG",
                "EOH",
                "FPH",
            ],
            "correct_answer": "EPH",
            "explanation": (
                "Each letter is shifted forward by one position."
            ),
        },

        # ------------------------------------------------------
        # LOGICAL — BLOOD RELATIONS
        # ------------------------------------------------------

        {
            "category": "logical",
            "topic": "blood_relations",
            "difficulty": "easy",
            "question": (
                "A is the brother of B. B is the sister of C. "
                "How is A related to C?"
            ),
            "options": [
                "Father",
                "Brother",
                "Uncle",
                "Cousin",
            ],
            "correct_answer": "Brother",
            "explanation": (
                "A and B are siblings, and B and C are siblings. "
                "Therefore A is C's brother."
            ),
        },

        # ------------------------------------------------------
        # LOGICAL — DIRECTIONS
        # ------------------------------------------------------

        {
            "category": "logical",
            "topic": "directions",
            "difficulty": "medium",
            "question": (
                "A person walks 5 km north and then 3 km east. "
                "In which direction is the person from the starting point?"
            ),
            "options": [
                "North-East",
                "South-East",
                "North-West",
                "South-West",
            ],
            "correct_answer": "North-East",
            "explanation": (
                "Moving north and then east places the person north-east "
                "of the starting point."
            ),
        },

        # ------------------------------------------------------
        # LOGICAL — SYLLOGISM
        # ------------------------------------------------------

        {
            "category": "logical",
            "topic": "syllogism",
            "difficulty": "medium",
            "question": (
                "All cats are animals. All animals need food. "
                "Which conclusion follows?"
            ),
            "options": [
                "All cats need food",
                "All food is cats",
                "Some animals are not cats",
                "No cats need food",
            ],
            "correct_answer": "All cats need food",
            "explanation": (
                "Since all cats are animals and all animals need food, "
                "all cats need food."
            ),
        },

        # ------------------------------------------------------
        # VERBAL — GRAMMAR
        # ------------------------------------------------------

        {
            "category": "verbal",
            "topic": "grammar",
            "difficulty": "medium",
            "question": (
                "Choose the grammatically correct sentence."
            ),
            "options": [
                "She don't like coffee.",
                "She doesn't likes coffee.",
                "She doesn't like coffee.",
                "She not likes coffee.",
            ],
            "correct_answer": "She doesn't like coffee.",
            "explanation": (
                "After 'doesn't', the base form 'like' is used."
            ),
        },

        # ------------------------------------------------------
        # VERBAL — READING COMPREHENSION
        # ------------------------------------------------------

        {
            "category": "verbal",
            "topic": "reading_comprehension",
            "difficulty": "medium",
            "question": (
                "Reading comprehension questions primarily test which ability?"
            ),
            "options": [
                "Calculation",
                "Understanding written information",
                "Memorizing formulas",
                "Drawing diagrams",
            ],
            "correct_answer": "Understanding written information",
            "explanation": (
                "Reading comprehension evaluates the ability to understand "
                "and interpret written passages."
            ),
        },

        # ------------------------------------------------------
        # VERBAL — PARA JUMBLES
        # ------------------------------------------------------

        {
            "category": "verbal",
            "topic": "para_jumbles",
            "difficulty": "hard",
            "question": (
                "Which sentence should logically come first in a paragraph "
                "explaining healthy exercise habits?"
            ),
            "options": [
                "Therefore, exercise improves overall health.",
                "Regular physical activity is important for maintaining good health.",
                "As a result, people feel more energetic.",
                "These benefits continue over time.",
            ],
            "correct_answer": (
                "Regular physical activity is important for maintaining good health."
            ),
            "explanation": (
                "The opening sentence introduces the main idea before "
                "supporting details and conclusions."
            ),
        },
    ]

    questions.extend(
        topic_questions
    )

    # ==========================================================
    # DEDUPE
    # ==========================================================

    seen = set()
    unique = []

    for question in questions:
        dedupe_key = (
            question["question"],
            question["category"],
            question.get("topic"),
        )

        if dedupe_key in seen:
            continue

        seen.add(
            dedupe_key
        )

        unique.append(
            question
        )

    return unique


async def seed() -> None:

    settings = get_settings()

    client = AsyncIOMotorClient(
        settings.mongodb_uri
    )

    db = client[
        settings.database_name
    ]

    # Temporarily set global db for ensure_indexes
    import app.database as database

    database._db = db
    database._client = client

    await ensure_indexes()

    now = utcnow()

    # ==========================================================
    # SKILL ALIASES
    # ==========================================================

    for raw, canonical in SKILL_ALIASES:

        await db.skill_aliases.update_one(
            {
                "raw": raw
            },
            {
                "$set": {
                    "raw": raw,
                    "canonical": canonical,
                }
            },
            upsert=True,
        )

    print(
        f"Seeded {len(SKILL_ALIASES)} skill aliases"
    )

    # ==========================================================
    # SKILL QUESTION BANKS
    # ==========================================================

    for entry in SEED_SKILL_QUESTIONS:

        await db.skill_question_bank.update_one(
            {
                "skill_tag":
                    entry["skill_tag"],
                "category":
                    entry["category"],
            },
            {
                "$setOnInsert": {
                    "skill_tag":
                        entry["skill_tag"],
                    "category":
                        entry["category"],
                    "questions":
                        entry["questions"],
                    "created_at":
                        now,
                    "updated_at":
                        now,
                }
            },
            upsert=True,
        )

    print(
        f"Seeded {len(SEED_SKILL_QUESTIONS)} skill question banks"
    )

    # ==========================================================
    # APTITUDE BANK
    # ==========================================================

    aptitude = (
        generate_aptitude_questions()
    )

    inserted = 0

    for question in aptitude:

        result = await db.aptitude_bank.update_one(
            {
                "question":
                    question["question"],
                "category":
                    question["category"],
                "topic":
                    question.get("topic"),
            },
            {
                "$set": {
                    **question,
                    "updated_at": now,
                },
                "$setOnInsert": {
                    "created_at": now,
                },
            },
            upsert=True,
        )

        if result.upserted_id:
            inserted += 1

    total = await db.aptitude_bank.count_documents(
        {}
    )

    quantitative_count = (
        await db.aptitude_bank.count_documents(
            {
                "category":
                    "quantitative"
            }
        )
    )

    logical_count = (
        await db.aptitude_bank.count_documents(
            {
                "category":
                    "logical"
            }
        )
    )

    verbal_count = (
        await db.aptitude_bank.count_documents(
            {
                "category":
                    "verbal"
            }
        )
    )

    print(
        f"Aptitude bank: {total} total "
        f"({inserted} newly inserted)"
    )

    print(
        f"Quantitative: {quantitative_count}"
    )

    print(
        f"Logical: {logical_count}"
    )

    print(
        f"Verbal: {verbal_count}"
    )

    client.close()

    print(
        "Seed complete."
    )


if __name__ == "__main__":
    asyncio.run(seed())
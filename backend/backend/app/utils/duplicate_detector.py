from app.utils.text import normalize_question_text


def is_duplicate(new_question: str, existing: list[str]) -> bool:
    normalized_new = normalize_question_text(new_question)
    if not normalized_new:
        return True
    for q in existing:
        if normalize_question_text(q) == normalized_new:
            return True
    return False


def deduplicate_questions(questions: list[dict]) -> list[dict]:
    seen: list[str] = []
    result: list[dict] = []
    for q in questions:
        text = q.get("question", "")
        if is_duplicate(text, seen):
            continue
        seen.append(text)
        result.append(q)
    return result

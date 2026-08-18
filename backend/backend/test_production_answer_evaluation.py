import json
import os
import time

import google.generativeai as genai
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY_1")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

if not GEMINI_API_KEY:
    raise RuntimeError("GEMINI_API_KEY_1 is not configured")

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY is not configured")


PROMPT = """
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

Do not invent candidate facts.
Base evaluation on the question and answer only.
"""


CONTEXT = {
    "question": (
        "Explain how FastAPI handles request validation "
        "and response serialization using Pydantic models."
    ),
    "suggested_answer": (
        "FastAPI uses Pydantic models to validate incoming "
        "request data and response models to serialize "
        "returned data."
    ),
    "user_answer": (
        "FastAPI uses Pydantic for validation. It checks "
        "the request fields and data types based on the "
        "model. For the response, FastAPI can use a response "
        "model to make sure the returned data follows the "
        "expected structure."
    ),
    "evidence": {
        "source": "resume",
        "section": "skills",
        "reference": "FastAPI",
        "snippet": "Built backend services using FastAPI",
    },
}


FULL_PROMPT = (
    f"{PROMPT}\n\n"
    f"QUESTION:\n{CONTEXT['question']}\n\n"
    f"SUGGESTED ANSWER:\n{CONTEXT['suggested_answer']}\n\n"
    f"CANDIDATE ANSWER:\n{CONTEXT['user_answer']}\n\n"
    f"EVIDENCE:\n{json.dumps(CONTEXT['evidence'], indent=2)}"
)


def parse_json(text: str):
    text = text.strip()

    if text.startswith("```"):
        if text.startswith("```json"):
            text = text[len("```json"):].strip()
        else:
            text = text[len("```"):].strip()

        if text.endswith("```"):
            text = text[:-3].strip()

    return json.loads(text)


def validate_evaluation(parsed):
    required_fields = {
        "score",
        "strengths",
        "weaknesses",
        "missing_points",
        "improvement_suggestions",
        "ideal_answer",
    }

    if not isinstance(parsed, dict):
        return False, ["Response is not a JSON object"]

    missing = required_fields - set(parsed.keys())

    if missing:
        return False, [
            f"Missing fields: {', '.join(sorted(missing))}"
        ]

    problems = []

    score = parsed.get("score")

    if not isinstance(score, (int, float)):
        problems.append("Score is not numeric")
    elif score < 0 or score > 100:
        problems.append("Score is outside 0-100")

    for field in [
        "strengths",
        "weaknesses",
        "missing_points",
        "improvement_suggestions",
    ]:
        if not isinstance(parsed.get(field), list):
            problems.append(f"{field} is not an array")

    if not isinstance(parsed.get("ideal_answer"), str):
        problems.append("ideal_answer is not a string")

    return len(problems) == 0, problems


def run_gemini():
    print("\n" + "=" * 80)
    print("PRODUCTION ANSWER EVALUATION - GEMINI")
    print("=" * 80)

    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel(GEMINI_MODEL)

    start = time.perf_counter()

    try:
        response = model.generate_content(
            FULL_PROMPT,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.2,
            },
        )
    except Exception as exc:
        elapsed = time.perf_counter() - start

        print(f"Model: {GEMINI_MODEL}")
        print(f"Request failed after: {elapsed:.3f} seconds")
        print(f"Error: {exc}")

        return {
            "provider": "Gemini",
            "model": GEMINI_MODEL,
            "success": False,
            "latency": elapsed,
            "error": str(exc),
            "parsed": None,
        }

    elapsed = time.perf_counter() - start
    raw = response.text or ""

    try:
        parsed = parse_json(raw)
        json_valid = True
    except Exception as exc:
        parsed = None
        json_valid = False
        print(f"JSON parsing error: {exc}")

    schema_valid = False
    schema_problems = []

    if parsed is not None:
        schema_valid, schema_problems = validate_evaluation(parsed)

    print(f"Model: {GEMINI_MODEL}")
    print(f"Response time: {elapsed:.3f} seconds")
    print(f"JSON valid: {json_valid}")
    print(f"Schema valid: {schema_valid}")

    if schema_problems:
        print("Schema problems:")
        for problem in schema_problems:
            print(f"  - {problem}")

    print("\nOutput:")
    print(json.dumps(parsed, indent=2))

    return {
        "provider": "Gemini",
        "model": GEMINI_MODEL,
        "success": True,
        "latency": elapsed,
        "json_valid": json_valid,
        "schema_valid": schema_valid,
        "schema_problems": schema_problems,
        "parsed": parsed,
    }


def run_groq():
    print("\n" + "=" * 80)
    print("PRODUCTION ANSWER EVALUATION - GROQ")
    print("=" * 80)

    client = Groq(api_key=GROQ_API_KEY)

    start = time.perf_counter()

    try:
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": FULL_PROMPT,
                }
            ],
            temperature=0.2,
            response_format={"type": "json_object"},
        )
    except Exception as exc:
        elapsed = time.perf_counter() - start

        print(f"Model: {GROQ_MODEL}")
        print(f"Request failed after: {elapsed:.3f} seconds")
        print(f"Error: {exc}")

        return {
            "provider": "Groq",
            "model": GROQ_MODEL,
            "success": False,
            "latency": elapsed,
            "error": str(exc),
            "parsed": None,
        }

    elapsed = time.perf_counter() - start
    raw = response.choices[0].message.content or ""

    try:
        parsed = parse_json(raw)
        json_valid = True
    except Exception as exc:
        parsed = None
        json_valid = False
        print(f"JSON parsing error: {exc}")

    schema_valid = False
    schema_problems = []

    if parsed is not None:
        schema_valid, schema_problems = validate_evaluation(parsed)

    print(f"Model: {GROQ_MODEL}")
    print(f"Response time: {elapsed:.3f} seconds")
    print(f"JSON valid: {json_valid}")
    print(f"Schema valid: {schema_valid}")

    if schema_problems:
        print("Schema problems:")
        for problem in schema_problems:
            print(f"  - {problem}")

    print("\nOutput:")
    print(json.dumps(parsed, indent=2))

    return {
        "provider": "Groq",
        "model": GROQ_MODEL,
        "success": True,
        "latency": elapsed,
        "json_valid": json_valid,
        "schema_valid": schema_valid,
        "schema_problems": schema_problems,
        "parsed": parsed,
    }


def print_comparison(gemini, groq):
    print("\n" + "=" * 80)
    print("FINAL ANSWER-EVALUATION COMPARISON")
    print("=" * 80)

    print(
        f"{'Metric':<35}"
        f"{'Gemini':<22}"
        f"{'Groq':<22}"
    )
    print("-" * 79)

    gemini_latency = (
        f"{gemini['latency']:.3f}"
        if gemini.get("success")
        else "FAILED"
    )

    groq_latency = (
        f"{groq['latency']:.3f}"
        if groq.get("success")
        else "FAILED"
    )

    print(
        f"{'Latency (seconds)':<35}"
        f"{gemini_latency:<22}"
        f"{groq_latency:<22}"
    )

    print(
        f"{'JSON valid':<35}"
        f"{str(gemini.get('json_valid', False)):<22}"
        f"{str(groq.get('json_valid', False)):<22}"
    )

    print(
        f"{'Schema valid':<35}"
        f"{str(gemini.get('schema_valid', False)):<22}"
        f"{str(groq.get('schema_valid', False)):<22}"
    )

    if gemini.get("success") and groq.get("success"):
        if groq["latency"] < gemini["latency"]:
            difference = gemini["latency"] - groq["latency"]
            ratio = gemini["latency"] / groq["latency"]

            print(
                f"\nGroq was faster by "
                f"{difference:.3f} seconds."
            )

            print(
                f"Groq was approximately "
                f"{ratio:.2f}x faster."
            )

        elif gemini["latency"] < groq["latency"]:
            difference = groq["latency"] - gemini["latency"]
            ratio = groq["latency"] / gemini["latency"]

            print(
                f"\nGemini was faster by "
                f"{difference:.3f} seconds."
            )

            print(
                f"Gemini was approximately "
                f"{ratio:.2f}x faster."
            )

        else:
            print("\nBoth providers had identical latency.")

    if gemini.get("parsed") and groq.get("parsed"):
        print("\nScore comparison:")

        print(
            f"Gemini score: "
            f"{gemini['parsed'].get('score')}"
        )

        print(
            f"Groq score:   "
            f"{groq['parsed'].get('score')}"
        )


def main():
    print("=" * 80)
    print("INTERVIEWAI PRODUCTION ANSWER EVALUATION BENCHMARK")
    print("=" * 80)

    print(f"Gemini model: {GEMINI_MODEL}")
    print(f"Groq model:   {GROQ_MODEL}")
    print("\nThe SAME question, answer, evidence and prompt")
    print("are sent to both providers.")

    gemini = run_gemini()
    groq = run_groq()

    print_comparison(gemini, groq)


if __name__ == "__main__":
    main()
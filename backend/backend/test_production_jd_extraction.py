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
Extract a structured job description from the supplied JD text.

Return ONLY valid JSON:

{
  "title": "string or null",
  "company": "string or null",
  "location": "string or null",
  "employment_type": "string or null",
  "experience_required": "string or null",
  "salary_range": "string or null",
  "summary": "string or null",
  "required_skills": [],
  "preferred_skills": [],
  "responsibilities": [],
  "qualifications": [],
  "education_requirements": [],
  "certifications": [],
  "nice_to_have": [],
  "other_requirements": []
}

Rules:

1. Extract only information explicitly present in the JD.
2. Never invent technologies, qualifications, experience,
   salary, company names, or responsibilities.
3. Preserve readable skill names.
4. Never concatenate separate words.
5. Technical skills should remain concrete when possible.
6. Broad competency requirements such as:
   "Application Programming Languages",
   "Database Management Systems",
   "Web Application Development",
   "Software Testing",
   may remain as readable competency categories.
7. Place mandatory technical/domain requirements in
   required_skills.
8. Place optional technical/domain requirements in
   preferred_skills.
9. Place communication, teamwork, leadership, collaboration
   and similar soft skills in qualifications or
   other_requirements unless the JD clearly treats them
   as a technical requirement.
10. Preserve responsibilities in responsibilities.
11. Preserve education requirements in education_requirements.
12. Preserve certifications in certifications.
13. Return empty arrays when a section does not exist.
14. Return null for missing scalar values.
15. Return only JSON.
"""


JD_TEXT = """
Backend Developer

Company: Example Technologies
Location: Bangalore, India
Employment Type: Full-time
Experience: 2-4 years

About the Role

We are looking for a Backend Developer to build and maintain
scalable backend services and REST APIs.

Responsibilities

- Design and develop backend APIs using Python and FastAPI.
- Build database-backed services using PostgreSQL and MongoDB.
- Improve API performance and reliability.
- Write unit and integration tests.
- Collaborate with frontend developers and product teams.
- Participate in code reviews and technical discussions.

Required Skills

- Python
- FastAPI
- REST APIs
- PostgreSQL
- MongoDB
- Git
- Unit testing
- Strong problem-solving skills
- Good communication skills

Preferred Skills

- Redis
- Docker
- AWS

Qualifications

- Bachelor's degree in Computer Science or a related field.
- Strong analytical and communication skills.

Education Requirements

- Bachelor's degree in Computer Science or related field.

Certifications

- AWS certification is preferred.

Salary

₹8,00,000 - ₹14,00,000 per year
"""


FULL_PROMPT = f"""
{PROMPT}

JD TEXT:
{JD_TEXT}
"""


def run_gemini():
    print("\n" + "=" * 80)
    print("PRODUCTION JD EXTRACTION - GEMINI")
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
        parsed = json.loads(raw)
        valid_json = True
    except Exception as exc:
        parsed = None
        valid_json = False
        print(f"JSON parsing error: {exc}")

    print(f"Model: {GEMINI_MODEL}")
    print(f"Response time: {elapsed:.3f} seconds")
    print(f"JSON valid: {valid_json}")

    print("\nOutput:")
    print(json.dumps(parsed, indent=2))

    return {
        "provider": "Gemini",
        "model": GEMINI_MODEL,
        "success": True,
        "latency": elapsed,
        "json_valid": valid_json,
        "parsed": parsed,
    }


def run_groq():
    print("\n" + "=" * 80)
    print("PRODUCTION JD EXTRACTION - GROQ")
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
        parsed = json.loads(raw)
        valid_json = True
    except Exception as exc:
        parsed = None
        valid_json = False
        print(f"JSON parsing error: {exc}")

    print(f"Model: {GROQ_MODEL}")
    print(f"Response time: {elapsed:.3f} seconds")
    print(f"JSON valid: {valid_json}")

    print("\nOutput:")
    print(json.dumps(parsed, indent=2))

    return {
        "provider": "Groq",
        "model": GROQ_MODEL,
        "success": True,
        "latency": elapsed,
        "json_valid": valid_json,
        "parsed": parsed,
    }


EXPECTED = {
    "title": "Backend Developer",
    "company": "Example Technologies",
    "location": "Bangalore, India",
    "employment_type": "Full-time",
    "experience_required": "2-4 years",
    "required_skills": {
        "Python",
        "FastAPI",
        "REST APIs",
        "PostgreSQL",
        "MongoDB",
        "Git",
        "Unit testing",
        "Strong problem-solving skills",
        "Good communication skills",
    },
    "preferred_skills": {
        "Redis",
        "Docker",
        "AWS",
    },
    "responsibilities": {
        "Design and develop backend APIs using Python and FastAPI.",
        "Build database-backed services using PostgreSQL and MongoDB.",
        "Improve API performance and reliability.",
        "Write unit and integration tests.",
        "Collaborate with frontend developers and product teams.",
        "Participate in code reviews and technical discussions.",
    },
    "education": {
        "Bachelor's degree in Computer Science or a related field."
    },
    "certifications": {
        "AWS certification is preferred."
    },
    "salary": "₹8,00,000 - ₹14,00,000 per year",
}


def normalise(value):
    if not isinstance(value, str):
        return value

    return " ".join(value.strip().split()).lower()


def normalise_set(values):
    if not isinstance(values, list):
        return set()

    return {
        normalise(value)
        for value in values
        if isinstance(value, str) and value.strip()
    }


def analyse_result(result):
    data = result.get("parsed")

    if not result.get("success") or not isinstance(data, dict):
        return {
            "scalar_fields": 0,
            "scalar_total": 6,
            "required_found": 0,
            "required_total": len(EXPECTED["required_skills"]),
            "preferred_found": 0,
            "preferred_total": len(EXPECTED["preferred_skills"]),
            "responsibilities_found": 0,
            "responsibilities_total": len(EXPECTED["responsibilities"]),
            "education_found": False,
            "certification_found": False,
            "salary_correct": False,
            "invented_items": [],
        }

    scalar_checks = [
        data.get("title") == EXPECTED["title"],
        data.get("company") == EXPECTED["company"],
        data.get("location") == EXPECTED["location"],
        data.get("employment_type") == EXPECTED["employment_type"],
        data.get("experience_required") == EXPECTED["experience_required"],
        normalise(data.get("salary_range", "")) == normalise(EXPECTED["salary"]),
    ]

    scalar_fields = sum(scalar_checks)

    required = normalise_set(data.get("required_skills"))
    preferred = normalise_set(data.get("preferred_skills"))

    expected_required = {
        normalise(value)
        for value in EXPECTED["required_skills"]
    }

    expected_preferred = {
        normalise(value)
        for value in EXPECTED["preferred_skills"]
    }

    responsibilities = normalise_set(
        data.get("responsibilities")
    )

    expected_responsibilities = {
        normalise(value)
        for value in EXPECTED["responsibilities"]
    }

    education_values = normalise_set(
        data.get("education_requirements")
    )

    expected_education = {
        normalise(value)
        for value in EXPECTED["education"]
    }

    certification_values = normalise_set(
        data.get("certifications")
    )

    expected_certifications = {
        normalise(value)
        for value in EXPECTED["certifications"]
    }

    known_required = expected_required
    known_preferred = expected_preferred

    known_responsibilities = expected_responsibilities

    invented_items = []

    for skill in required:
        if skill not in known_required:
            invented_items.append(
                f"Unexpected required skill: {skill}"
            )

    for skill in preferred:
        if skill not in known_preferred:
            invented_items.append(
                f"Unexpected preferred skill: {skill}"
            )

    for responsibility in responsibilities:
        if responsibility not in known_responsibilities:
            invented_items.append(
                f"Unexpected responsibility: {responsibility}"
            )

    return {
        "scalar_fields": scalar_fields,
        "scalar_total": 6,
        "required_found": len(required & expected_required),
        "required_total": len(expected_required),
        "preferred_found": len(preferred & expected_preferred),
        "preferred_total": len(expected_preferred),
        "responsibilities_found": len(
            responsibilities & expected_responsibilities
        ),
        "responsibilities_total": len(expected_responsibilities),
        "education_found": bool(
            education_values & expected_education
        ),
        "certification_found": bool(
            certification_values & expected_certifications
        ),
        "salary_correct": (
            normalise(data.get("salary_range", ""))
            == normalise(EXPECTED["salary"])
        ),
        "invented_items": invented_items,
    }


def print_analysis(name, result):
    print("\n" + "=" * 80)
    print(f"{name} ANALYSIS")
    print("=" * 80)

    analysis = analyse_result(result)

    print(
        f"Scalar fields recovered: "
        f"{analysis['scalar_fields']}/"
        f"{analysis['scalar_total']}"
    )

    print(
        f"Required skills recovered: "
        f"{analysis['required_found']}/"
        f"{analysis['required_total']}"
    )

    print(
        f"Preferred skills recovered: "
        f"{analysis['preferred_found']}/"
        f"{analysis['preferred_total']}"
    )

    print(
        f"Responsibilities recovered: "
        f"{analysis['responsibilities_found']}/"
        f"{analysis['responsibilities_total']}"
    )

    print(
        f"Education requirement recovered: "
        f"{analysis['education_found']}"
    )

    print(
        f"Certification recovered: "
        f"{analysis['certification_found']}"
    )

    print(
        f"Salary correct: "
        f"{analysis['salary_correct']}"
    )

    if analysis["invented_items"]:
        print("\nPotential invented items:")

        for item in analysis["invented_items"]:
            print(f"  - {item}")

    else:
        print("\nPotential invented items: NONE")


def main():
    print("=" * 80)
    print("INTERVIEWAI PRODUCTION JD EXTRACTION BENCHMARK")
    print("=" * 80)

    print(f"Gemini model: {GEMINI_MODEL}")
    print(f"Groq model:   {GROQ_MODEL}")

    print(
        "\nThe SAME JD text and SAME extraction prompt "
        "are sent to both providers."
    )

    gemini = run_gemini()
    groq = run_groq()

    print_analysis("GEMINI", gemini)
    print_analysis("GROQ", groq)

    gemini_analysis = analyse_result(gemini)
    groq_analysis = analyse_result(groq)

    print("\n" + "=" * 80)
    print("FINAL COMPARISON")
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

    gemini_total = (
        gemini_analysis["scalar_fields"]
        + gemini_analysis["required_found"]
        + gemini_analysis["preferred_found"]
        + gemini_analysis["responsibilities_found"]
        + int(gemini_analysis["education_found"])
        + int(gemini_analysis["certification_found"])
    )

    groq_total = (
        groq_analysis["scalar_fields"]
        + groq_analysis["required_found"]
        + groq_analysis["preferred_found"]
        + groq_analysis["responsibilities_found"]
        + int(groq_analysis["education_found"])
        + int(groq_analysis["certification_found"])
    )

    total_expected = (
        6
        + len(EXPECTED["required_skills"])
        + len(EXPECTED["preferred_skills"])
        + len(EXPECTED["responsibilities"])
        + 1
        + 1
    )

    print(
        f"{'Expected fact coverage':<35}"
        f"{gemini_total}/{total_expected:<20}"
        f"{groq_total}/{total_expected}"
    )

    print(
        f"{'Potential invented items':<35}"
        f"{len(gemini_analysis['invented_items']):<22}"
        f"{len(groq_analysis['invented_items']):<22}"
    )

    if gemini.get("success") and groq.get("success"):
        if groq["latency"] < gemini["latency"]:
            difference = gemini["latency"] - groq["latency"]
            ratio = gemini["latency"] / groq["latency"]

            print(
                f"\nGroq was faster by "
                f"{difference:.3f} seconds "
                f"({ratio:.2f}x)."
            )

        else:
            difference = groq["latency"] - gemini["latency"]
            ratio = groq["latency"] / gemini["latency"]

            print(
                f"\nGemini was faster by "
                f"{difference:.3f} seconds "
                f"({ratio:.2f}x)."
            )


if __name__ == "__main__":
    main()
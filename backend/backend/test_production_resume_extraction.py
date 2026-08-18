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
Extract a structured candidate profile from the resume text.

Return ONLY valid JSON:

{
  "name": "string or null",
  "skills": ["skill1"],
  "projects": [
    {
      "title": "...",
      "description": "...",
      "tech_stack": ["..."]
    }
  ],
  "experience": [
    {
      "role": "...",
      "company": "...",
      "duration_months": 0,
      "responsibilities": ["..."]
    }
  ],
  "certifications": ["..."],
  "education": [
    {
      "degree": "...",
      "institution": "...",
      "year": 0
    }
  ]
}

Rules:

1. Extract only information explicitly present in the resume.
2. Never invent candidate facts.
3. Preserve readable skill names.
4. Do NOT concatenate words together.
5. Keep names such as:
   "React.js"
   "ReactJS"
   "PostgreSQL"
   "Kubernetes"
   "Object-Oriented Programming (OOP)"
   in readable form.
6. Keep project technology names readable.
7. Preserve project descriptions and responsibilities.
8. Return empty arrays when a section is absent.
9. Return null for unavailable scalar fields.
"""


RESUME_TEXT = """
HARI KUMAR
Backend Developer

PROFESSIONAL SUMMARY
Backend developer with 2 years of experience building REST APIs and
database-driven applications. Experienced with Python, FastAPI, Django,
MongoDB and PostgreSQL.

TECHNICAL SKILLS
Programming Languages: Python, JavaScript
Frameworks: FastAPI, Django, React.js
Databases: MongoDB, PostgreSQL
APIs: REST APIs
Concepts: Object-Oriented Programming (OOP), asynchronous programming

EXPERIENCE

Backend Developer
ABC Technologies
January 2024 - December 2025

- Developed REST APIs using FastAPI and Python.
- Built backend services for internal business applications.
- Worked with MongoDB and PostgreSQL for data persistence.
- Implemented request validation and API integration.
- Collaborated with frontend developers to integrate backend APIs.

PROJECTS

Interview Platform
- Built a web application for conducting technical interviews.
- Developed backend APIs using Python and FastAPI.
- Used MongoDB to persist interview sessions and candidate responses.
- Implemented authentication and REST API endpoints.

E-commerce API
- Developed a Django-based REST API for product and order management.
- Used PostgreSQL for storing application data.

EDUCATION

Bachelor of Technology in Computer Science
Example Institute of Technology
2023

CERTIFICATIONS

AWS Certified Cloud Practitioner
"""


FULL_PROMPT = (
    f"{PROMPT}\n\n"
    f"RESUME TEXT:\n{RESUME_TEXT}"
)


def run_gemini():
    print("\n" + "=" * 80)
    print("PRODUCTION RESUME EXTRACTION - GEMINI")
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
        json_valid = True
    except Exception as exc:
        parsed = None
        json_valid = False
        print(f"JSON parsing error: {exc}")

    print(f"Model: {GEMINI_MODEL}")
    print(f"Response time: {elapsed:.3f} seconds")
    print(f"JSON valid: {json_valid}")

    print("\nOutput:")
    print(json.dumps(parsed, indent=2))

    return {
        "provider": "Gemini",
        "model": GEMINI_MODEL,
        "success": True,
        "latency": elapsed,
        "json_valid": json_valid,
        "parsed": parsed,
    }


def run_groq():
    print("\n" + "=" * 80)
    print("PRODUCTION RESUME EXTRACTION - GROQ")
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
        json_valid = True
    except Exception as exc:
        parsed = None
        json_valid = False
        print(f"JSON parsing error: {exc}")

    print(f"Model: {GROQ_MODEL}")
    print(f"Response time: {elapsed:.3f} seconds")
    print(f"JSON valid: {json_valid}")

    print("\nOutput:")
    print(json.dumps(parsed, indent=2))

    return {
        "provider": "Groq",
        "model": GROQ_MODEL,
        "success": True,
        "latency": elapsed,
        "json_valid": json_valid,
        "parsed": parsed,
    }


EXPECTED = {
    "name": "HARI KUMAR",
    "skill_names": {
        "Python",
        "JavaScript",
        "FastAPI",
        "Django",
        "React.js",
        "MongoDB",
        "PostgreSQL",
        "REST APIs",
        "Object-Oriented Programming (OOP)",
        "asynchronous programming",
    },
    "project_names": {
        "Interview Platform",
        "E-commerce API",
    },
    "experience_role": "Backend Developer",
    "experience_company": "ABC Technologies",
    "education_degree": "Bachelor of Technology in Computer Science",
    "education_institution": "Example Institute of Technology",
    "education_year": 2023,
    "certification": "AWS Certified Cloud Practitioner",
}


def analyse_result(result):
    if not result.get("success"):
        return {
            "name_correct": False,
            "skills_found": 0,
            "skills_total": len(EXPECTED["skill_names"]),
            "projects_found": 0,
            "projects_total": len(EXPECTED["project_names"]),
            "experience_correct": False,
            "education_correct": False,
            "certification_found": False,
            "invented_items": [],
        }

    data = result.get("parsed")

    if not isinstance(data, dict):
        return {
            "name_correct": False,
            "skills_found": 0,
            "skills_total": len(EXPECTED["skill_names"]),
            "projects_found": 0,
            "projects_total": len(EXPECTED["project_names"]),
            "experience_correct": False,
            "education_correct": False,
            "certification_found": False,
            "invented_items": ["Top-level response is not an object"],
        }

    skills = {
        str(skill).strip()
        for skill in data.get("skills", [])
        if isinstance(skill, str)
    }

    projects = {
        str(project.get("title", "")).strip()
        for project in data.get("projects", [])
        if isinstance(project, dict)
    }

    experience = data.get("experience", [])

    experience_correct = False

    for item in experience:
        if not isinstance(item, dict):
            continue

        if (
            item.get("role") == EXPECTED["experience_role"]
            and item.get("company") == EXPECTED["experience_company"]
        ):
            experience_correct = True

    education_correct = False

    for item in data.get("education", []):
        if not isinstance(item, dict):
            continue

        if (
            item.get("degree") == EXPECTED["education_degree"]
            and item.get("institution") == EXPECTED["education_institution"]
            and item.get("year") == EXPECTED["education_year"]
        ):
            education_correct = True

    certifications = {
        str(cert).strip()
        for cert in data.get("certifications", [])
        if isinstance(cert, str)
    }

    known_resume_terms = {
        "HARI KUMAR",
        "Python",
        "JavaScript",
        "FastAPI",
        "Django",
        "React.js",
        "MongoDB",
        "PostgreSQL",
        "REST APIs",
        "Object-Oriented Programming (OOP)",
        "asynchronous programming",
        "Interview Platform",
        "E-commerce API",
        "Backend Developer",
        "ABC Technologies",
        "Bachelor of Technology in Computer Science",
        "Example Institute of Technology",
        "AWS Certified Cloud Practitioner",
    }

    invented_items = []

    for skill in skills:
        if skill not in known_resume_terms:
            invented_items.append(f"Skill: {skill}")

    for project in projects:
        if project and project not in known_resume_terms:
            invented_items.append(f"Project: {project}")

    for cert in certifications:
        if cert not in known_resume_terms:
            invented_items.append(f"Certification: {cert}")

    return {
        "name_correct": data.get("name") == EXPECTED["name"],
        "skills_found": len(skills & EXPECTED["skill_names"]),
        "skills_total": len(EXPECTED["skill_names"]),
        "projects_found": len(projects & EXPECTED["project_names"]),
        "projects_total": len(EXPECTED["project_names"]),
        "experience_correct": experience_correct,
        "education_correct": education_correct,
        "certification_found": EXPECTED["certification"] in certifications,
        "invented_items": invented_items,
    }


def print_analysis(name, result):
    print("\n" + "=" * 80)
    print(f"{name} ANALYSIS")
    print("=" * 80)

    analysis = analyse_result(result)

    print(
        f"Name correct: "
        f"{analysis['name_correct']}"
    )

    print(
        f"Skills recovered: "
        f"{analysis['skills_found']}/"
        f"{analysis['skills_total']}"
    )

    print(
        f"Projects recovered: "
        f"{analysis['projects_found']}/"
        f"{analysis['projects_total']}"
    )

    print(
        f"Experience correct: "
        f"{analysis['experience_correct']}"
    )

    print(
        f"Education correct: "
        f"{analysis['education_correct']}"
    )

    print(
        f"Certification found: "
        f"{analysis['certification_found']}"
    )

    if analysis["invented_items"]:
        print("\nPotential invented items:")

        for item in analysis["invented_items"]:
            print(f"  - {item}")

    else:
        print("\nPotential invented items: NONE")


def main():
    print("=" * 80)
    print("INTERVIEWAI PRODUCTION RESUME EXTRACTION BENCHMARK")
    print("=" * 80)

    print(f"Gemini model: {GEMINI_MODEL}")
    print(f"Groq model:   {GROQ_MODEL}")

    print("\nThe SAME resume text and SAME extraction prompt")
    print("are sent to both providers.")

    gemini = run_gemini()
    groq = run_groq()

    print_analysis("GEMINI", gemini)
    print_analysis("GROQ", groq)

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

    gemini_analysis = analyse_result(gemini)
    groq_analysis = analyse_result(groq)

    gemini_coverage = (
        int(gemini_analysis["name_correct"])
        + gemini_analysis["skills_found"]
        + gemini_analysis["projects_found"]
        + int(gemini_analysis["experience_correct"])
        + int(gemini_analysis["education_correct"])
        + int(gemini_analysis["certification_found"])
    )

    groq_coverage = (
        int(groq_analysis["name_correct"])
        + groq_analysis["skills_found"]
        + groq_analysis["projects_found"]
        + int(groq_analysis["experience_correct"])
        + int(groq_analysis["education_correct"])
        + int(groq_analysis["certification_found"])
    )

    total_coverage = (
        1
        + len(EXPECTED["skill_names"])
        + len(EXPECTED["project_names"])
        + 1
        + 1
        + 1
    )

    print(
        f"{'Expected fact coverage':<35}"
        f"{gemini_coverage}/{total_coverage:<20}"
        f"{groq_coverage}/{total_coverage}"
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

        elif gemini["latency"] < groq["latency"]:
            difference = groq["latency"] - gemini["latency"]
            ratio = groq["latency"] / gemini["latency"]

            print(
                f"\nGemini was faster by "
                f"{difference:.3f} seconds "
                f"({ratio:.2f}x)."
            )


if __name__ == "__main__":
    main()
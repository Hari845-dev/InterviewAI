import re

from fastapi import HTTPException, UploadFile

from app.ai.ai_provider import (
    get_ai_provider,
)
from app.database import get_db
from app.schemas.resume import (
    ResumeAnalysisResponse,
    ResumeProfileResponse,
    StructuredProfile,
)
from app.utils.document_validator import (
    validate_resume_document,
)
from app.utils.file_parser import (
    extract_text_from_bytes,
    validate_upload,
)
from app.utils.text import (
    hash_content,
    utcnow,
)


class ResumeService:

    # ==========================================================
    # UPLOAD + PARSE RESUME
    # ==========================================================

    async def upload_and_parse(
        self,
        user_id: str,
        file: UploadFile,
    ) -> ResumeProfileResponse:

        content = await validate_upload(file)

        filename = (
            file.filename
            or "resume.txt"
        )

        raw_text = extract_text_from_bytes(
            content,
            filename,
        )

        if len(raw_text.strip()) < 50:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Resume text too short "
                    "or unreadable"
                ),
            )

        resume_hash = hash_content(
            raw_text
        )

        db = get_db()

        # ------------------------------------------------------
        # EXISTING RESUME
        # ------------------------------------------------------
        #
        # Check the cache before document identity validation.
        #
        # This allows an already-processed resume to be reused
        # without re-running document classification.
        #
        # Fresh documents are still validated below before AI
        # extraction and persistence.
        # ------------------------------------------------------

        cached = await db.resume_profiles.find_one(
            {
                "user_id": user_id,
                "resume_hash": resume_hash,
            }
        )

        if cached:

            stored_profile = (
                cached.get(
                    "structured_profile",
                    {},
                )
                or {}
            )

            if not isinstance(
                stored_profile,
                dict,
            ):
                stored_profile = {}

            await db.resume_profiles.update_one(
                {
                    "_id": cached["_id"],
                },
                {
                    "$set": {
                        "last_used_at":
                            utcnow(),
                    },
                    "$inc": {
                        "hit_count": 1,
                    },
                },
            )

            profile = (
                StructuredProfile.model_validate(
                    stored_profile
                )
            )

            return ResumeProfileResponse(
                resume_hash=resume_hash,
                structured_profile=profile,
                cached=True,
                created_at=cached.get(
                    "created_at"
                ),
            )

        # ------------------------------------------------------
        # DOCUMENT-TYPE VALIDATION
        # ------------------------------------------------------

        validation = validate_resume_document(
            raw_text,
            filename,
        )

        print(
            "RESUME VALIDATION DEBUG:",
            {
                "valid":
                    validation.is_valid,
                "score":
                    validation.score,
                "reasons":
                    validation.reasons,
                "message":
                    validation.message,
            },
        )

        if not validation.is_valid:
            raise HTTPException(
                status_code=400,
                detail=validation.message,
            )

        # ------------------------------------------------------
        # ADDITIONAL IDENTITY VALIDATION
        # ------------------------------------------------------

        self._validate_resume_identity(
            raw_text,
            filename,
        )

        # ------------------------------------------------------
        # FRESH AI EXTRACTION
        # ------------------------------------------------------

        structured = (
            await self._extract_profile(
                raw_text
            )
        )

        # ------------------------------------------------------
        # PRESERVE READABLE DISPLAY VALUES
        # ------------------------------------------------------
        #
        # This normalization is applied to newly extracted
        # profiles before storing them.
        #
        # Existing cached profiles are intentionally not rewritten
        # during reads. This prevents historical/raw values such
        # as "python" from silently changing to "Python".
        # ------------------------------------------------------

        structured.skills = (
            self._clean_display_list(
                structured.skills
            )
        )

        for project in (
            structured.projects
        ):
            project.tech_stack = (
                self._clean_display_list(
                    project.tech_stack
                )
            )

        now = utcnow()

        doc = {
            "user_id":
                user_id,
            "resume_hash":
                resume_hash,
            "filename":
                filename,
            "structured_profile":
                structured.model_dump(),
            "created_at":
                now,
            "last_used_at":
                now,
            "hit_count":
                0,
        }

        await db.resume_profiles.insert_one(
            doc
        )

        return ResumeProfileResponse(
            resume_hash=resume_hash,
            structured_profile=structured,
            cached=False,
            created_at=now,
        )

    # ==========================================================
    # RESUME IDENTITY VALIDATION
    # ==========================================================

    def _validate_resume_identity(
        self,
        text: str,
        filename: str | None,
    ) -> None:
        """
        Perform a lightweight candidate-identity check.

        A resume should normally contain:

        1. A plausible candidate name.
        2. Contact information such as an email address
           or phone number.

        This helper exists independently from the broader
        document classifier so it can also be tested directly.
        """

        clean_text = (
            text or ""
        ).strip()

        if not clean_text:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Resume identity validation failed: "
                    "candidate name and email or phone number "
                    "are required."
                ),
            )

        email_pattern = re.compile(
            r"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b",
            re.IGNORECASE,
        )

        phone_pattern = re.compile(
            r"(?<!\d)"
            r"(?:\+?\d{1,3}[\s.-]?)?"
            r"(?:\(?\d{2,5}\)?[\s.-]?)?"
            r"\d{3,4}[\s.-]?\d{3,4}"
            r"(?!\d)"
        )

        has_email = bool(
            email_pattern.search(
                clean_text
            )
        )

        has_phone = bool(
            phone_pattern.search(
                clean_text
            )
        )

        # Look for a plausible name in the first several lines.
        lines = [
            line.strip()
            for line in clean_text.splitlines()
            if line.strip()
        ]

        name_candidate = None

        for line in lines[:8]:

            if len(line) > 80:
                continue

            if email_pattern.search(
                line
            ):
                continue

            if phone_pattern.search(
                line
            ):
                continue

            lowered = line.lower()

            blocked_tokens = (
                "resume",
                "curriculum vitae",
                "cv",
                "profile",
                "summary",
                "objective",
                "skills",
                "experience",
                "education",
                "projects",
                "certification",
                "developer",
                "engineer",
                "application",
                "software",
                "dashboard",
                "startup",
                "company",
            )

            if any(
                token in lowered
                for token in blocked_tokens
            ):
                continue

            words = re.findall(
                r"[A-Za-z][A-Za-z.'-]*",
                line,
            )

            if (
                2 <= len(words) <= 5
            ):
                alpha_words = [
                    word
                    for word in words
                    if len(word) >= 2
                ]

                if (
                    len(alpha_words)
                    >= 2
                ):
                    name_candidate = line
                    break

        has_name = bool(
            name_candidate
        )

        if not has_name or not (
            has_email or has_phone
        ):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Resume identity validation failed: "
                    "candidate name and email or phone number "
                    "are required."
                ),
            )

    # ==========================================================
    # GET ANALYSIS
    # ==========================================================

    async def get_analysis(
        self,
        user_id: str,
        resume_hash: str,
    ) -> ResumeAnalysisResponse:

        db = get_db()

        doc = await db.resume_profiles.find_one(
            {
                "user_id":
                    user_id,
                "resume_hash":
                    resume_hash,
            }
        )

        if not doc:
            raise HTTPException(
                status_code=404,
                detail="Resume not found",
            )

        stored_profile = (
            doc.get(
                "structured_profile",
                {},
            )
            or {}
        )

        if not isinstance(
            stored_profile,
            dict,
        ):
            stored_profile = {}

        profile = (
            StructuredProfile.model_validate(
                stored_profile
            )
        )

        return ResumeAnalysisResponse(
            resume_hash=
                resume_hash,
            structured_profile=
                profile,
            skills_count=
                len(profile.skills),
            projects_count=
                len(profile.projects),
            experience_count=
                len(profile.experience),
        )

    # ==========================================================
    # GET PROFILE
    # ==========================================================

    async def get_profile(
        self,
        user_id: str,
        resume_hash: str,
    ) -> StructuredProfile:

        db = get_db()

        doc = await db.resume_profiles.find_one(
            {
                "user_id":
                    user_id,
                "resume_hash":
                    resume_hash,
            }
        )

        if not doc:
            raise HTTPException(
                status_code=404,
                detail="Resume not found",
            )

        stored_profile = (
            doc.get(
                "structured_profile",
                {},
            )
            or {}
        )

        if not isinstance(
            stored_profile,
            dict,
        ):
            stored_profile = {}

        # Do not rewrite stored display values when simply
        # reading a profile.
        return StructuredProfile.model_validate(
            stored_profile
        )

    # ==========================================================
    # AI PROFILE EXTRACTION
    # ==========================================================

    async def _extract_profile(
        self,
        text: str,
    ) -> StructuredProfile:

        ai = get_ai_provider()

        if not ai.is_available:
            return self._fallback_profile(
                text
            )

        prompt = """
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

        try:

            parsed, _ = (
                await ai.generate_json(
                    prompt,
                    {
                        "resume_text":
                            text[:12000]
                    },
                )
            )

            if isinstance(
                parsed,
                dict,
            ):

                normalized = (
                    self._normalize_extracted_profile(
                        parsed
                    )
                )

                return (
                    StructuredProfile.model_validate(
                        normalized
                    )
                )

            raise HTTPException(
                status_code=502,
                detail=(
                    "Invalid resume extraction "
                    "response"
                ),
            )

        except HTTPException:
            return self._fallback_profile(
                text
            )

    # ==========================================================
    # NORMALIZE AI OUTPUT
    # ==========================================================

    def _normalize_extracted_profile(
        self,
        parsed: dict,
    ) -> dict:

        def clean_text(
            value,
        ):

            if value is None:
                return ""

            return str(
                value
            ).strip()

        def clean_list(
            values,
        ):

            if values is None:
                return []

            if not isinstance(
                values,
                list,
            ):

                text = clean_text(
                    values
                )

                return (
                    [text]
                    if text
                    else []
                )

            cleaned: list[str] = []

            for item in values:

                text = clean_text(
                    item
                )

                if text:
                    cleaned.append(
                        text
                    )

            return cleaned

        projects: list[dict] = []

        for project in (
            parsed.get(
                "projects"
            )
            or []
        ):

            if not isinstance(
                project,
                dict,
            ):
                continue

            projects.append(
                {
                    "title":
                        clean_text(
                            project.get(
                                "title"
                            )
                        ),
                    "description":
                        clean_text(
                            project.get(
                                "description"
                            )
                        ),
                    "tech_stack":
                        clean_list(
                            project.get(
                                "tech_stack"
                            )
                        ),
                }
            )

        experience: list[dict] = []

        for exp in (
            parsed.get(
                "experience"
            )
            or []
        ):

            if not isinstance(
                exp,
                dict,
            ):
                continue

            try:
                duration_months = int(
                    exp.get(
                        "duration_months"
                    )
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                duration_months = 0

            experience.append(
                {
                    "role":
                        clean_text(
                            exp.get(
                                "role"
                            )
                        ),
                    "company":
                        clean_text(
                            exp.get(
                                "company"
                            )
                        ),
                    "duration_months":
                        duration_months,
                    "responsibilities":
                        clean_list(
                            exp.get(
                                "responsibilities"
                            )
                        ),
                }
            )

        education: list[dict] = []

        for edu in (
            parsed.get(
                "education"
            )
            or []
        ):

            if not isinstance(
                edu,
                dict,
            ):
                continue

            try:
                year = int(
                    edu.get(
                        "year"
                    )
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                year = 0

            education.append(
                {
                    "degree":
                        clean_text(
                            edu.get(
                                "degree"
                            )
                        ),
                    "institution":
                        clean_text(
                            edu.get(
                                "institution"
                            )
                        ),
                    "year":
                        year,
                }
            )

        return {
            "name":
                clean_text(
                    parsed.get(
                        "name"
                    )
                )
                or None,

            "skills":
                clean_list(
                    parsed.get(
                        "skills"
                    )
                ),

            "projects":
                projects,

            "experience":
                experience,

            "certifications":
                clean_list(
                    parsed.get(
                        "certifications"
                    )
                ),

            "education":
                education,
        }

    # ==========================================================
    # REPAIR EXISTING STORED PROFILE
    # ==========================================================

    def _repair_stored_profile(
        self,
        stored: dict,
    ) -> dict:

        if not isinstance(
            stored,
            dict,
        ):
            return {}

        repaired = dict(
            stored
        )

        repaired_projects = []

        for project in (
            repaired.get(
                "projects",
                [],
            )
            or []
        ):

            if not isinstance(
                project,
                dict,
            ):
                continue

            project_copy = dict(
                project
            )

            repaired_projects.append(
                project_copy
            )

        repaired["projects"] = (
            repaired_projects
        )

        return repaired

    # ==========================================================
    # CLEAN DISPLAY SKILL LIST
    # ==========================================================

    def _clean_display_list(
        self,
        values,
    ) -> list[str]:

        if not values:
            return []

        result: list[str] = []
        seen: set[str] = set()

        for value in values:

            readable = (
                self._display_skill(
                    value
                )
            )

            if not readable:
                continue

            key = (
                readable
                .lower()
                .strip()
            )

            if key in seen:
                continue

            seen.add(
                key
            )

            result.append(
                readable
            )

        return result

    # ==========================================================
    # DISPLAY-FRIENDLY SKILL NAME
    # ==========================================================

    def _display_skill(
        self,
        skill,
    ) -> str:

        if skill is None:
            return ""

        value = str(
            skill
        ).strip()

        if not value:
            return ""

        lowered = (
            value
            .lower()
            .strip()
        )

        known = {
            "py": "Python",
            "python3": "Python",
            "python": "Python",

            "js": "JavaScript",
            "javascript": "JavaScript",
            "javascriptes6":
                "JavaScript",

            "ts": "TypeScript",
            "typescript": "TypeScript",

            "reactjs": "React",
            "react.js": "React",
            "react": "React",

            "nodejs": "Node.js",
            "node.js": "Node.js",
            "node": "Node.js",

            "postgres": "PostgreSQL",
            "postgresql": "PostgreSQL",
            "psql": "PostgreSQL",

            "mongo": "MongoDB",
            "mongodb": "MongoDB",

            "mysql": "MySQL",
            "sqlserver": "SQL Server",
            "sqlite3": "SQLite",

            "k8s": "Kubernetes",
            "kubernetes": "Kubernetes",

            "aws": "AWS",
            "amazonwebservices": "AWS",

            "azure": "Azure",
            "microsoftazure": "Azure",

            "gcp": "Google Cloud",
            "googlecloud": "Google Cloud",
            "googlecloudplatform":
                "Google Cloud",

            "fastapi": "FastAPI",
            "django": "Django",
            "flask": "Flask",

            "docker": "Docker",
            "dockercompose":
                "Docker Compose",

            "java": "Java",
            "csharp": "C#",
            "c#": "C#",

            "cpp": "C++",
            "cplusplus": "C++",
            "c++": "C++",

            "kotlin": "Kotlin",
            "golang": "Go",

            "nextjs": "Next.js",
            "next.js": "Next.js",

            "vuejs": "Vue",
            "vue.js": "Vue",
            "vue": "Vue",

            "angularjs": "Angular",
            "angular": "Angular",

            "pytest": "PyTest",
            "jest": "Jest",
            "junit": "JUnit",
            "selenium": "Selenium",

            "pandas": "Pandas",
            "numpy": "NumPy",

            "sklearn": "scikit-learn",
            "scikitlearn": "scikit-learn",
            "scikit-learn": "scikit-learn",

            "ml": "Machine Learning",
            "machinelearning":
                "Machine Learning",

            "ai": "Artificial Intelligence",
            "artificialintelligence":
                "Artificial Intelligence",

            "nlp":
                "Natural Language Processing",
            "naturallanguageprocessing":
                "Natural Language Processing",

            "tensorflow": "TensorFlow",
            "tf": "TensorFlow",

            "pytorch": "PyTorch",
            "torch": "PyTorch",

            "kafka": "Apache Kafka",
            "apachekafka": "Apache Kafka",

            "rabbitmq": "RabbitMQ",

            "restapi": "REST APIs",
            "restapis": "REST APIs",
            "restfulapi": "REST APIs",
            "rest": "REST APIs",

            "graphql": "GraphQL",

            "sql": "SQL",

            "objectorientedprogramming":
                "Object-Oriented Programming",

            "objectorientedprogrammingoop":
                "Object-Oriented Programming (OOP)",

            "applicationprogramminglanguages":
                "Application Programming Languages",

            "applicationprogramminglanguage":
                "Application Programming Language",

            "databasemanagementsystems":
                "Database Management Systems",

            "databasemanagementsystem":
                "Database Management System",

            "softwaretesting":
                "Software Testing",

            "unittesting":
                "Unit Testing",

            "integrationtesting":
                "Integration Testing",

            "communication":
                "Communication",

            "communicationskills":
                "Communication Skills",

            "problemsolving":
                "Problem Solving",

            "systemdesign":
                "System Design",

            "leadership":
                "Leadership",

            "teamwork":
                "Teamwork",
        }

        if lowered in known:
            return known[
                lowered
            ]

        if " " in value:
            return value.strip()

        return (
            value
            .replace(
                "_",
                " ",
            )
            .replace(
                "-",
                " ",
            )
            .strip()
        )

    # ==========================================================
    # FALLBACK PROFILE
    # ==========================================================

    def _fallback_profile(
        self,
        text: str,
    ) -> StructuredProfile:

        common = [
            "Python",
            "Java",
            "JavaScript",
            "React",
            "Node.js",
            "SQL",
            "MongoDB",
            "AWS",
            "Docker",
            "Kubernetes",
            "Flask",
            "FastAPI",
            "Machine Learning",
        ]

        lower = text.lower()

        skills = [
            skill
            for skill in common
            if skill.lower()
            in lower
        ]

        return StructuredProfile(
            skills=skills
        )
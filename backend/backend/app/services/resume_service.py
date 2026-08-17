from fastapi import HTTPException, UploadFile

from app.ai.gemini_orchestrator import (
    get_gemini_orchestrator,
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

        content = await validate_upload(
            file
        )

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

        # ------------------------------------------------------
        # DOCUMENT-TYPE VALIDATION
        # ------------------------------------------------------
        #
        # IMPORTANT:
        # This validation happens AFTER text extraction but
        # BEFORE hashing, Gemini processing, cache lookup,
        # or MongoDB insertion.
        #
        # This prevents unrelated PDFs/DOCX files such as:
        # assessments, manuals, invoices, test instructions,
        # certificates, etc. from being processed as resumes.
        # ------------------------------------------------------

        validation = validate_resume_document(
            raw_text,
            filename,
        )
        print(
        "RESUME VALIDATION DEBUG:",
        {
            "valid": validation.is_valid,
            "score": validation.score,
            "reasons": validation.reasons,
            "message": validation.message,
        },
)

        if not validation.is_valid:
            raise HTTPException(
                status_code=400,
                detail=validation.message,
            )

        resume_hash = hash_content(
            raw_text
        )

        db = get_db()

        # ------------------------------------------------------
        # EXISTING RESUME
        # ------------------------------------------------------

        cached = await db.resume_profiles.find_one(
            {
                "user_id": user_id,
                "resume_hash": resume_hash,
            }
        )

        if cached:

            # Repair old records that may contain
            # normalized/compressed skill names.
            repaired_profile = (
                self._repair_stored_profile(
                    cached.get(
                        "structured_profile",
                        {},
                    )
                )
            )

            await db.resume_profiles.update_one(
                {
                    "_id": cached["_id"],
                },
                {
                    "$set": {
                        "structured_profile":
                            repaired_profile,
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
                    repaired_profile
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
        # FRESH EXTRACTION
        # ------------------------------------------------------

        structured = (
            await self._extract_profile(
                raw_text
            )
        )

        # IMPORTANT:
        #
        # Do NOT normalize skills before storing.
        #
        # We preserve readable resume values such as:
        #
        # React.js
        # PostgreSQL
        # Object-Oriented Programming (OOP)
        # Kubernetes
        #
        # Matching will normalize these values only
        # when comparison is required.

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
            "user_id": user_id,
            "resume_hash": resume_hash,
            "filename": filename,
            "structured_profile":
                structured.model_dump(),
            "created_at": now,
            "last_used_at": now,
            "hit_count": 0,
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
                "user_id": user_id,
                "resume_hash": resume_hash,
            }
        )

        if not doc:
            raise HTTPException(
                status_code=404,
                detail="Resume not found",
            )

        repaired_profile = (
            self._repair_stored_profile(
                doc.get(
                    "structured_profile",
                    {},
                )
            )
        )

        # Persist the repaired readable values.
        await db.resume_profiles.update_one(
            {
                "_id": doc["_id"],
            },
            {
                "$set": {
                    "structured_profile":
                        repaired_profile
                }
            },
        )

        profile = (
            StructuredProfile.model_validate(
                repaired_profile
            )
        )

        return ResumeAnalysisResponse(
            resume_hash=resume_hash,
            structured_profile=profile,
            skills_count=len(
                profile.skills
            ),
            projects_count=len(
                profile.projects
            ),
            experience_count=len(
                profile.experience
            ),
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
                "user_id": user_id,
                "resume_hash": resume_hash,
            }
        )

        if not doc:
            raise HTTPException(
                status_code=404,
                detail="Resume not found",
            )

        repaired_profile = (
            self._repair_stored_profile(
                doc.get(
                    "structured_profile",
                    {},
                )
            )
        )

        # Save repaired profile so future requests
        # receive readable values immediately.
        await db.resume_profiles.update_one(
            {
                "_id": doc["_id"],
            },
            {
                "$set": {
                    "structured_profile":
                        repaired_profile
                }
            },
        )

        return StructuredProfile.model_validate(
            repaired_profile
        )

    # ==========================================================
    # GEMINI EXTRACTION
    # ==========================================================

    async def _extract_profile(
        self,
        text: str,
    ) -> StructuredProfile:

        gemini = (
            get_gemini_orchestrator()
        )

        if not gemini.is_available:
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
                await gemini.generate_json(
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
    # CLEAN GEMINI OUTPUT
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

        # ------------------------------------------------------
        # PROJECTS
        # ------------------------------------------------------

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

        # ------------------------------------------------------
        # EXPERIENCE
        # ------------------------------------------------------

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

        # ------------------------------------------------------
        # EDUCATION
        # ------------------------------------------------------

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
            return stored

        repaired = dict(
            stored
        )

        # ------------------------------------------------------
        # REPAIR SKILLS
        # ------------------------------------------------------

        repaired["skills"] = (
            self._clean_display_list(
                repaired.get(
                    "skills",
                    [],
                )
            )
        )

        # ------------------------------------------------------
        # REPAIR PROJECT TECH STACK
        # ------------------------------------------------------

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

            project_copy[
                "tech_stack"
            ] = (
                self._clean_display_list(
                    project_copy.get(
                        "tech_stack",
                        [],
                    )
                )
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
            # Python
            "py": "Python",
            "python3": "Python",
            "python": "Python",

            # JavaScript
            "js": "JavaScript",
            "javascript": "JavaScript",
            "javascriptes6":
                "JavaScript",

            # TypeScript
            "ts": "TypeScript",
            "typescript":
                "TypeScript",

            # React
            "reactjs": "React",
            "react.js": "React",
            "react": "React",

            # Node
            "nodejs": "Node.js",
            "node.js": "Node.js",
            "node": "Node.js",

            # Databases
            "postgres":
                "PostgreSQL",
            "postgresql":
                "PostgreSQL",
            "psql":
                "PostgreSQL",

            "mongo":
                "MongoDB",
            "mongodb":
                "MongoDB",

            "mysql":
                "MySQL",

            "sqlserver":
                "SQL Server",

            "sqlite3":
                "SQLite",

            # Kubernetes
            "k8s":
                "Kubernetes",
            "kubernetes":
                "Kubernetes",

            # Cloud
            "aws":
                "AWS",
            "amazonwebservices":
                "AWS",

            "azure":
                "Azure",
            "microsoftazure":
                "Azure",

            "gcp":
                "Google Cloud",
            "googlecloud":
                "Google Cloud",
            "googlecloudplatform":
                "Google Cloud",

            # Backend
            "fastapi":
                "FastAPI",
            "django":
                "Django",
            "flask":
                "Flask",

            # Containers
            "docker":
                "Docker",
            "dockercompose":
                "Docker Compose",

            # Languages
            "java":
                "Java",
            "csharp":
                "C#",
            "c#":
                "C#",
            "cpp":
                "C++",
            "cplusplus":
                "C++",
            "c++":
                "C++",
            "kotlin":
                "Kotlin",
            "golang":
                "Go",

            # Frontend
            "nextjs":
                "Next.js",
            "next.js":
                "Next.js",
            "vuejs":
                "Vue",
            "vue.js":
                "Vue",
            "vue":
                "Vue",
            "angularjs":
                "Angular",
            "angular":
                "Angular",

            # Testing
            "pytest":
                "PyTest",
            "jest":
                "Jest",
            "junit":
                "JUnit",
            "selenium":
                "Selenium",

            # Data
            "pandas":
                "Pandas",
            "numpy":
                "NumPy",
            "sklearn":
                "scikit-learn",
            "scikitlearn":
                "scikit-learn",
            "scikit-learn":
                "scikit-learn",

            # AI / ML
            "ml":
                "Machine Learning",
            "machinelearning":
                "Machine Learning",
            "ai":
                "Artificial Intelligence",
            "artificialintelligence":
                "Artificial Intelligence",
            "nlp":
                "Natural Language Processing",
            "naturallanguageprocessing":
                "Natural Language Processing",

            "tensorflow":
                "TensorFlow",
            "tf":
                "TensorFlow",

            "pytorch":
                "PyTorch",
            "torch":
                "PyTorch",

            # Messaging
            "kafka":
                "Apache Kafka",
            "apachekafka":
                "Apache Kafka",
            "rabbitmq":
                "RabbitMQ",

            # APIs
            "restapi":
                "REST APIs",
            "restapis":
                "REST APIs",
            "restfulapi":
                "REST APIs",
            "rest":
                "REST APIs",

            "graphql":
                "GraphQL",

            # General technical
            "sql":
                "SQL",

            # Common phrases
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

        # ------------------------------------------------------
        # Preserve readable multi-word values.
        # ------------------------------------------------------

        if " " in value:
            return value.strip()

        # ------------------------------------------------------
        # Basic separator cleanup.
        # ------------------------------------------------------

        readable = (
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

        return readable

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
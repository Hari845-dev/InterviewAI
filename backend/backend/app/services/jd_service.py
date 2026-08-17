from fastapi import HTTPException, UploadFile

from app.ai.gemini_orchestrator import get_gemini_orchestrator
from app.database import get_db
from app.schemas.jd import (
    JDProfileResponse,
    SkillEvidence,
    SkillMatchResponse,
    StructuredJD,
)
from app.services.resume_service import ResumeService
from app.services.skill_normalization import (
    get_skill_normalization_service,
)
from app.utils.document_validator import (
    validate_jd_document,
)
from app.utils.file_parser import (
    extract_text_from_bytes,
    validate_upload,
)
from app.utils.text import (
    hash_content,
    normalize_skill_raw,
    utcnow,
)


class JDService:

    # ==========================================================
    # CATEGORY-BASED SEMANTIC SKILL GROUPS
    # ==========================================================
    #
    # These are controlled mappings, not fuzzy guesses.
    # They allow broad JD requirements such as:
    #
    #   "Application Programming Languages"
    #
    # to be supported by concrete resume skills such as:
    #
    #   Python, Java, C++, JavaScript, C#, TypeScript...
    #
    # ==========================================================

    CATEGORY_SKILLS: dict[str, set[str]] = {
        "applicationprogramminglanguages": {
            "python",
            "java",
            "javascript",
            "typescript",
            "c",
            "c++",
            "c#",
            "kotlin",
            "go",
            "golang",
            "rust",
            "ruby",
            "php",
            "swift",
        },

        "objectorientedprogrammingoop": {
            "java",
            "c++",
            "c#",
            "python",
            "kotlin",
            "ruby",
            "swift",
            "objectorientedprogrammingoop",
            "objectorientedprogramming",
        },

        "objectorientedprogramming": {
            "java",
            "c++",
            "c#",
            "python",
            "kotlin",
            "ruby",
            "swift",
            "objectorientedprogrammingoop",
            "objectorientedprogramming",
        },

        "databasemanagementsystems": {
            "mysql",
            "postgresql",
            "sqlserver",
            "mongodb",
            "sqlite",
            "oracle",
            "redis",
            "mariadb",
            "cassandra",
            "dynamodb",
            "database",
            "sql",
        },

        "webapplicationdevelopment": {
            "react",
            "angular",
            "vue",
            "next.js",
            "node.js",
            "expressjs",
            "express",
            "asp.netcore",
            ".net",
            "fastapi",
            "django",
            "flask",
            "spring",
            "springboot",
            "javascript",
            "typescript",
            "html",
            "css",
            "rest",
            "graphql",
        },

        "softwaretesting": {
            "pytest",
            "jest",
            "junit",
            "selenium",
            "cypress",
            "unittesting",
            "integrationtesting",
            "testing",
            "softwaretesting",
            "postman",
        },

        "cloudcomputing": {
            "aws",
            "azure",
            "gcp",
            "googlecloud",
        },

        "containerization": {
            "docker",
            "dockercompose",
            "kubernetes",
        },

        "versioncontrol": {
            "git",
            "github",
            "gitlab",
            "bitbucket",
        },

        "machinelearning": {
            "machinelearning",
            "tensorflow",
            "pytorch",
            "scikit-learn",
            "pandas",
            "numpy",
        },
    }

    # ==========================================================
    # HUMAN-READABLE CATEGORY NAMES
    # ==========================================================

    CATEGORY_DISPLAY_NAMES: dict[str, str] = {
        "applicationprogramminglanguages":
            "Application Programming Languages",

        "objectorientedprogrammingoop":
            "Object-Oriented Programming (OOP)",

        "objectorientedprogramming":
            "Object-Oriented Programming",

        "databasemanagementsystems":
            "Database Management Systems",

        "webapplicationdevelopment":
            "Web Application Development",

        "softwaretesting":
            "Software Testing",

        "cloudcomputing":
            "Cloud Computing",

        "containerization":
            "Containerization",

        "versioncontrol":
            "Version Control",

        "machinelearning":
            "Machine Learning",
    }

    # ==========================================================
    # UPLOAD + PARSE JD
    # ==========================================================

    async def upload_and_parse(
        self,
        user_id: str,
        file: UploadFile,
    ) -> JDProfileResponse:

        # ------------------------------------------------------
        # 1. FILE TYPE / SIZE VALIDATION
        # ------------------------------------------------------

        content = await validate_upload(file)

        filename = (
            file.filename
            or "job-description.txt"
        )

        # ------------------------------------------------------
        # 2. EXTRACT TEXT
        # ------------------------------------------------------

        raw_text = extract_text_from_bytes(
            content,
            filename,
        )

        # ------------------------------------------------------
        # 3. BASIC TEXT VALIDATION
        # ------------------------------------------------------

        if len(raw_text.strip()) < 30:
            raise HTTPException(
                status_code=400,
                detail=(
                    "Job description text is too short "
                    "or unreadable."
                ),
            )

        # ------------------------------------------------------
        # 4. JD DOCUMENT IDENTITY VALIDATION
        # ------------------------------------------------------
        #
        # IMPORTANT:
        #
        # This validation happens BEFORE Gemini.
        #
        # Random PDFs, resumes, certificates, assessments,
        # invoices, manuals, etc. are rejected here.
        #
        # Only documents that resemble an actual job
        # description continue to Gemini extraction.
        # ------------------------------------------------------

        validation = validate_jd_document(
            raw_text,
            filename,
        )

        if not validation.is_valid:
            raise HTTPException(
                status_code=400,
                detail=validation.message,
            )

        # ------------------------------------------------------
        # 5. HASH VALIDATED JD
        # ------------------------------------------------------

        jd_hash = hash_content(
            raw_text
        )

        db = get_db()

        # ------------------------------------------------------
        # 6. EXISTING JD
        # ------------------------------------------------------

        cached = await db.jd_profiles.find_one(
            {
                "user_id": user_id,
                "jd_hash": jd_hash,
            }
        )

        if cached:
            structured = StructuredJD(
                **cached.get(
                    "structured_jd",
                    {},
                )
            )

            return JDProfileResponse(
                jd_hash=jd_hash,
                filename=(
                    cached.get(
                        "filename"
                    )
                    or filename
                ),
                structured_jd=structured,
                cached=True,
                created_at=cached.get(
                    "created_at"
                ),
            )

        # ------------------------------------------------------
        # 7. FRESH GEMINI EXTRACTION
        # ------------------------------------------------------

        structured = await self._extract_jd(
            raw_text
        )

        # ------------------------------------------------------
        # 8. PRESERVE READABLE DISPLAY VALUES
        # ------------------------------------------------------

        structured.required_skills = (
            self._clean_display_list(
                structured.required_skills
            )
        )

        structured.preferred_skills = (
            self._clean_display_list(
                structured.preferred_skills
            )
        )

        structured.nice_to_have = (
            self._clean_display_list(
                structured.nice_to_have
            )
        )

        # ------------------------------------------------------
        # 9. STORE IN MONGODB
        # ------------------------------------------------------

        now = utcnow()

        doc = {
            "user_id": user_id,
            "jd_hash": jd_hash,
            "filename": filename,
            "structured_jd":
                structured.model_dump(),
            "created_at": now,
            "updated_at": now,
        }

        await db.jd_profiles.insert_one(
            doc
        )

        # ------------------------------------------------------
        # 10. RESPONSE
        # ------------------------------------------------------

        return JDProfileResponse(
            jd_hash=jd_hash,
            filename=filename,
            structured_jd=structured,
            cached=False,
            created_at=now,
        )

    # ==========================================================
    # GET JD
    # ==========================================================

    async def get_structured_jd(
        self,
        user_id: str,
        jd_hash: str,
    ) -> StructuredJD:

        db = get_db()

        doc = await db.jd_profiles.find_one(
            {
                "user_id": user_id,
                "jd_hash": jd_hash,
            }
        )

        if not doc:
            raise HTTPException(
                status_code=404,
                detail="JD not found",
            )

        return StructuredJD(
            **doc.get(
                "structured_jd",
                {},
            )
        )

    # ==========================================================
    # LIST ALL JDS
    # ==========================================================

    async def list_jds(
        self,
        user_id: str,
    ) -> list[dict]:

        db = get_db()

        cursor = (
            db.jd_profiles
            .find(
                {
                    "user_id": user_id,
                }
            )
            .sort(
                "created_at",
                -1,
            )
        )

        return [
            doc
            async for doc in cursor
        ]

    # ==========================================================
    # DELETE JD
    # ==========================================================

    async def delete_jd(
        self,
        user_id: str,
        jd_hash: str,
    ) -> bool:

        db = get_db()

        result = await db.jd_profiles.delete_one(
            {
                "user_id": user_id,
                "jd_hash": jd_hash,
            }
        )

        if result.deleted_count == 0:
            raise HTTPException(
                status_code=404,
                detail="JD not found",
            )

        return True

    # ==========================================================
    # MATCH RESUME WITH JD
    # ==========================================================

    async def match_skills(
        self,
        user_id: str,
        resume_hash: str,
        jd_hash: str,
    ) -> SkillMatchResponse:

        db = get_db()

        # ------------------------------------------------------
        # LOAD RESUME
        # ------------------------------------------------------

        profile = await ResumeService().get_profile(
            user_id,
            resume_hash,
        )

        # ------------------------------------------------------
        # LOAD JD
        # ------------------------------------------------------

        jd_doc = await db.jd_profiles.find_one(
            {
                "user_id": user_id,
                "jd_hash": jd_hash,
            }
        )

        if not jd_doc:
            raise HTTPException(
                status_code=404,
                detail="JD not found",
            )

        jd = StructuredJD(
            **jd_doc.get(
                "structured_jd",
                {},
            )
        )

        normalizer = (
            get_skill_normalization_service()
        )

        # ======================================================
        # RESUME SKILLS
        # ======================================================

        raw_resume_skills = [
            str(skill).strip()
            for skill in (
                profile.skills or []
            )
            if str(skill).strip()
        ]

        resume_skill_map: dict[
            str,
            list[str],
        ] = {}

        for raw_skill in raw_resume_skills:

            normalized = await normalizer.normalize(
                raw_skill
            )

            if normalized:
                resume_skill_map.setdefault(
                    normalized,
                    [],
                ).append(
                    raw_skill
                )

        resume_skills = set(
            resume_skill_map.keys()
        )

        # ======================================================
        # JD REQUIRED SKILLS
        # ======================================================

        required_map: dict[
            str,
            str,
        ] = {}

        for raw_skill in (
            jd.required_skills
        ):

            normalized = await normalizer.normalize(
                raw_skill
            )

            if normalized:
                required_map[
                    normalized
                ] = self._display_skill(
                    raw_skill
                )

        required = set(
            required_map.keys()
        )

        # ======================================================
        # JD PREFERRED SKILLS
        # ======================================================

        preferred_map: dict[
            str,
            str,
        ] = {}

        for raw_skill in (
            jd.preferred_skills
        ):

            normalized = await normalizer.normalize(
                raw_skill
            )

            if normalized:
                preferred_map[
                    normalized
                ] = self._display_skill(
                    raw_skill
                )

        preferred = set(
            preferred_map.keys()
        )

        # ======================================================
        # EVIDENCE INDEX
        # ======================================================

        evidence_index = (
            self._build_resume_evidence_index(
                profile
            )
        )

        skill_evidence: list[
            SkillEvidence
        ] = []

        matched_required: set[str] = set()
        partial_required: set[str] = set()
        missing_required: set[str] = set()

        matched_display: list[str] = []
        partial_display: list[str] = []
        missing_display: list[str] = []

        # ======================================================
        # REQUIRED SKILL EVALUATION
        # ======================================================

        for normalized_skill in sorted(
            required
        ):

            display_skill = required_map[
                normalized_skill
            ]

            # --------------------------------------------------
            # 1. EXACT MATCH
            # --------------------------------------------------

            if normalized_skill in resume_skills:

                matched_required.add(
                    normalized_skill
                )

                evidence = (
                    self._find_skill_evidence(
                        normalized_skill,
                        evidence_index,
                    )
                )

                matched_display.append(
                    display_skill
                )

                skill_evidence.append(
                    SkillEvidence(
                        skill=display_skill,
                        status="matched",
                        evidence_type=(
                            evidence["type"]
                            if evidence
                            else "skill"
                        ),
                        evidence=(
                            evidence["text"]
                            if evidence
                            else (
                                f"The resume explicitly "
                                f"lists {display_skill}."
                            )
                        ),
                        confidence=95.0,
                    )
                )

                continue

            # --------------------------------------------------
            # 2. CATEGORY MATCH
            # --------------------------------------------------

            category_match = (
                self._find_category_match(
                    normalized_skill,
                    resume_skills,
                    resume_skill_map,
                )
            )

            if category_match:

                matched_required.add(
                    normalized_skill
                )

                matched_display.append(
                    display_skill
                )

                supporting = category_match[
                    "supporting_skills"
                ]

                skill_evidence.append(
                    SkillEvidence(
                        skill=display_skill,
                        status="matched",
                        evidence_type="skill",
                        evidence=(
                            f"The resume supports this "
                            f"requirement through: "
                            f"{', '.join(supporting)}."
                        ),
                        confidence=93.0,
                    )
                )

                continue

            # --------------------------------------------------
            # 3. PROJECT / EXPERIENCE PARTIAL EVIDENCE
            # --------------------------------------------------

            partial = (
                self._find_partial_category_evidence(
                    normalized_skill,
                    display_skill,
                    resume_skills,
                    evidence_index,
                )
            )

            if partial:

                partial_required.add(
                    normalized_skill
                )

                partial_display.append(
                    display_skill
                )

                skill_evidence.append(
                    SkillEvidence(
                        skill=display_skill,
                        status="partial",
                        evidence_type=(
                            partial["type"]
                        ),
                        evidence=(
                            partial["text"]
                        ),
                        confidence=(
                            partial["confidence"]
                        ),
                    )
                )

                continue

            # --------------------------------------------------
            # 4. MISSING
            # --------------------------------------------------

            missing_required.add(
                normalized_skill
            )

            missing_display.append(
                display_skill
            )

            skill_evidence.append(
                SkillEvidence(
                    skill=display_skill,
                    status="missing",
                    evidence_type="none",
                    evidence=(
                        f"No sufficient evidence for "
                        f"{display_skill} was found "
                        f"in the resume."
                    ),
                    confidence=90.0,
                )
            )

        # ======================================================
        # PREFERRED SKILLS
        # ======================================================

        weak_display: list[str] = []

        for normalized_skill in sorted(
            preferred
        ):

            display_skill = preferred_map[
                normalized_skill
            ]

            if normalized_skill in resume_skills:

                evidence = (
                    self._find_skill_evidence(
                        normalized_skill,
                        evidence_index,
                    )
                )

                skill_evidence.append(
                    SkillEvidence(
                        skill=display_skill,
                        status="matched",
                        evidence_type=(
                            evidence["type"]
                            if evidence
                            else "skill"
                        ),
                        evidence=(
                            evidence["text"]
                            if evidence
                            else (
                                f"The resume explicitly "
                                f"lists {display_skill}."
                            )
                        ),
                        confidence=92.0,
                    )
                )

            else:

                category_match = (
                    self._find_category_match(
                        normalized_skill,
                        resume_skills,
                        resume_skill_map,
                    )
                )

                if category_match:

                    skill_evidence.append(
                        SkillEvidence(
                            skill=display_skill,
                            status="matched",
                            evidence_type="skill",
                            evidence=(
                                f"The resume supports "
                                f"{display_skill} through: "
                                f"{', '.join(category_match['supporting_skills'])}."
                            ),
                            confidence=90.0,
                        )
                    )

                else:

                    partial = (
                        self._find_partial_category_evidence(
                            normalized_skill,
                            display_skill,
                            resume_skills,
                            evidence_index,
                        )
                    )

                    if partial:

                        skill_evidence.append(
                            SkillEvidence(
                                skill=display_skill,
                                status="partial",
                                evidence_type=(
                                    partial["type"]
                                ),
                                evidence=(
                                    partial["text"]
                                ),
                                confidence=(
                                    partial["confidence"]
                                ),
                            )
                        )

                    else:

                        weak_display.append(
                            display_skill
                        )

        # ======================================================
        # REQUIRED MATCH PERCENTAGE
        # ======================================================
        #
        # Exact/category MATCH = full credit
        # Partial = half credit
        # Missing = zero
        #
        # This prevents a partial match from being treated
        # identically to a fully verified skill.
        # ======================================================

        if required:

            weighted_score = (
                len(
                    matched_required
                )
                +
                (
                    len(
                        partial_required
                    )
                    * 0.5
                )
            )

            required_match_percentage = round(
                (
                    weighted_score
                    /
                    len(required)
                )
                * 100,
                1,
            )

        else:

            required_match_percentage = 0.0

        # ======================================================
        # RESUME DISPLAY SKILLS
        # ======================================================

        resume_display = sorted(
            {
                self._display_skill(
                    raw_skill
                )
                for raw_skill in raw_resume_skills
            }
        )

        # ======================================================
        # RETURN
        # ======================================================

        return SkillMatchResponse(
            resume_hash=resume_hash,
            jd_hash=jd_hash,

            matched_skills=sorted(
                set(
                    matched_display
                )
            ),

            missing_skills=sorted(
                set(
                    missing_display
                )
            ),

            weak_areas=sorted(
                set(
                    weak_display
                )
            ),

            resume_skills=resume_display,

            jd_required_skills=sorted(
                set(
                    required_map.values()
                )
            ),

            skill_evidence=skill_evidence,

            partial_skills=sorted(
                set(
                    partial_display
                )
            ),

            required_match_percentage=(
                required_match_percentage
            ),
        )

    # ==========================================================
    # CATEGORY MATCH
    # ==========================================================

    def _find_category_match(
        self,
        normalized_skill: str,
        resume_skills: set[str],
        resume_skill_map: dict[str, list[str]],
    ) -> dict | None:

        category_members = (
            self.CATEGORY_SKILLS.get(
                normalized_skill
            )
        )

        if not category_members:
            return None

        supporting: list[str] = []

        for skill in category_members:

            canonical = (
                normalize_skill_raw(
                    skill
                )
            )

            if canonical in resume_skills:

                supporting.extend(
                    resume_skill_map.get(
                        canonical,
                        [],
                    )
                )

        supporting = list(
            dict.fromkeys(
                supporting
            )
        )

        # One strong concrete technology is enough
        # to establish category support.
        if supporting:
            return {
                "supporting_skills":
                    supporting[:8]
            }

        return None

    # ==========================================================
    # PARTIAL CATEGORY EVIDENCE
    # ==========================================================

    def _find_partial_category_evidence(
        self,
        normalized_skill: str,
        display_skill: str,
        resume_skills: set[str],
        evidence_index: list[dict],
    ) -> dict | None:

        category_members = (
            self.CATEGORY_SKILLS.get(
                normalized_skill
            )
        )

        if not category_members:
            return None

        # Look for contextual evidence where the actual
        # technology was not extracted as a direct skill
        # but appears in project/experience text.
        for evidence in evidence_index:

            text = str(
                evidence.get(
                    "text",
                    "",
                )
            )

            compact_text = normalize_skill_raw(
                text
            )

            for skill in category_members:

                canonical = (
                    normalize_skill_raw(
                        skill
                    )
                )

                if (
                    canonical
                    and canonical
                    in compact_text
                ):

                    return {
                        "type":
                            evidence.get(
                                "type",
                                "resume",
                            ),
                        "text": (
                            f"Related evidence for "
                            f"{display_skill} was found "
                            f"in the candidate's "
                            f"{evidence.get('type', 'resume')} "
                            f"section: {text}"
                        ),
                        "confidence": 78.0,
                    }

        return None

    # ==========================================================
    # BUILD RESUME EVIDENCE INDEX
    # ==========================================================

    def _build_resume_evidence_index(
        self,
        profile,
    ) -> list[dict]:

        evidence_index: list[dict] = []

        # ------------------------------------------------------
        # SKILLS
        # ------------------------------------------------------

        for skill in (
            profile.skills or []
        ):

            skill_text = str(
                skill
            ).strip()

            if not skill_text:
                continue

            evidence_index.append(
                {
                    "type": "skill",
                    "text": (
                        f"Resume skills list: "
                        f"{self._display_skill(skill_text)}"
                    ),
                    "skills": [
                        normalize_skill_raw(
                            skill_text
                        )
                    ],
                }
            )

        # ------------------------------------------------------
        # PROJECTS
        # ------------------------------------------------------

        for project in (
            profile.projects or []
        ):

            project_title = getattr(
                project,
                "title",
                None,
            )

            description = getattr(
                project,
                "description",
                None,
            )

            tech_stack = getattr(
                project,
                "tech_stack",
                [],
            ) or []

            responsibilities = getattr(
                project,
                "responsibilities",
                [],
            ) or []

            highlights = getattr(
                project,
                "highlights",
                [],
            ) or []

            text_parts: list[str] = []

            if project_title:
                text_parts.append(
                    str(
                        project_title
                    )
                )

            if description:
                text_parts.append(
                    str(
                        description
                    )
                )

            if tech_stack:
                text_parts.append(
                    "Technologies: "
                    + ", ".join(
                        map(
                            str,
                            tech_stack,
                        )
                    )
                )

            if responsibilities:
                text_parts.extend(
                    [
                        str(item)
                        for item in responsibilities
                    ]
                )

            if highlights:
                text_parts.extend(
                    [
                        str(item)
                        for item in highlights
                    ]
                )

            full_text = " ".join(
                text_parts
            ).strip()

            normalized_skills = [
                normalize_skill_raw(
                    str(skill)
                )
                for skill in tech_stack
                if str(skill).strip()
            ]

            if full_text:

                evidence_index.append(
                    {
                        "type": "project",
                        "text": full_text,
                        "skills":
                            normalized_skills,
                    }
                )

        # ------------------------------------------------------
        # EXPERIENCE
        # ------------------------------------------------------

        for experience in (
            profile.experience or []
        ):

            role = getattr(
                experience,
                "role",
                None,
            )

            company = getattr(
                experience,
                "company",
                None,
            )

            responsibilities = getattr(
                experience,
                "responsibilities",
                [],
            ) or []

            highlights = getattr(
                experience,
                "highlights",
                [],
            ) or []

            text_parts: list[str] = []

            if role:
                text_parts.append(
                    str(
                        role
                    )
                )

            if company:
                text_parts.append(
                    str(
                        company
                    )
                )

            if responsibilities:
                text_parts.extend(
                    [
                        str(item)
                        for item in responsibilities
                    ]
                )

            if highlights:
                text_parts.extend(
                    [
                        str(item)
                        for item in highlights
                    ]
                )

            full_text = " ".join(
                text_parts
            ).strip()

            if full_text:

                evidence_index.append(
                    {
                        "type": "experience",
                        "text": full_text,
                        "skills": [],
                    }
                )

        # ------------------------------------------------------
        # EDUCATION
        # ------------------------------------------------------

        for education in (
            profile.education or []
        ):

            degree = getattr(
                education,
                "degree",
                None,
            )

            institution = getattr(
                education,
                "institution",
                None,
            )

            year = getattr(
                education,
                "year",
                None,
            )

            text_parts: list[str] = []

            if degree:
                text_parts.append(
                    str(
                        degree
                    )
                )

            if institution:
                text_parts.append(
                    str(
                        institution
                    )
                )

            if year:
                text_parts.append(
                    str(
                        year
                    )
                )

            full_text = " ".join(
                text_parts
            ).strip()

            if full_text:

                evidence_index.append(
                    {
                        "type": "education",
                        "text": full_text,
                        "skills": [],
                    }
                )

        # ------------------------------------------------------
        # CERTIFICATIONS
        # ------------------------------------------------------

        for certification in (
            profile.certifications or []
        ):

            if isinstance(
                certification,
                str,
            ):
                full_text = (
                    certification.strip()
                )

            else:
                name = getattr(
                    certification,
                    "name",
                    None,
                )

                issuer = getattr(
                    certification,
                    "issuer",
                    None,
                )

                year = getattr(
                    certification,
                    "year",
                    None,
                )

                text_parts = []

                if name:
                    text_parts.append(
                        str(name)
                    )

                if issuer:
                    text_parts.append(
                        str(issuer)
                    )

                if year:
                    text_parts.append(
                        str(year)
                    )

                full_text = " ".join(
                    text_parts
                ).strip()

            if full_text:

                evidence_index.append(
                    {
                        "type":
                            "certification",
                        "text":
                            full_text,
                        "skills": [],
                    }
                )

        return evidence_index

    # ==========================================================
    # FIND DIRECT SKILL EVIDENCE
    # ==========================================================

    def _find_skill_evidence(
        self,
        normalized_skill: str,
        evidence_index: list[dict],
    ) -> dict | None:

        for evidence in evidence_index:

            if normalized_skill in (
                evidence.get(
                    "skills",
                    [],
                )
            ):
                return evidence

        return None

    # ==========================================================
    # CLEAN DISPLAY LIST
    # ==========================================================

    def _clean_display_list(
        self,
        values: list[str],
    ) -> list[str]:

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

            seen.add(key)

            result.append(
                readable
            )

        return result

    # ==========================================================
    # DISPLAY SKILL
    # ==========================================================

    def _display_skill(
        self,
        skill: str,
    ) -> str:

        if not skill:
            return ""

        value = str(
            skill
        ).strip()

        lowered = (
            value
            .lower()
            .strip()
        )

        known = {
            "react":
                "React",
            "reactjs":
                "React",
            "react.js":
                "React",

            "node":
                "Node.js",
            "nodejs":
                "Node.js",
            "node.js":
                "Node.js",

            "postgres":
                "PostgreSQL",
            "postgresql":
                "PostgreSQL",
            "psql":
                "PostgreSQL",

            "mongodb":
                "MongoDB",
            "mongo":
                "MongoDB",

            "k8s":
                "Kubernetes",
            "kubernetes":
                "Kubernetes",

            "python":
                "Python",
            "python3":
                "Python",
            "py":
                "Python",

            "javascript":
                "JavaScript",
            "javascriptes6":
                "JavaScript",
            "js":
                "JavaScript",

            "typescript":
                "TypeScript",
            "ts":
                "TypeScript",

            "fastapi":
                "FastAPI",
            "django":
                "Django",
            "flask":
                "Flask",

            "docker":
                "Docker",
            "dockercompose":
                "Docker Compose",

            "aws":
                "AWS",
            "amazonwebservices":
                "AWS",

            "gcp":
                "Google Cloud",
            "googlecloud":
                "Google Cloud",

            "azure":
                "Azure",
            "microsoftazure":
                "Azure",

            "redis":
                "Redis",

            "sql":
                "SQL",
            "mysql":
                "MySQL",
            "sqlserver":
                "SQL Server",

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

            "java":
                "Java",

            "kotlin":
                "Kotlin",

            "golang":
                "Go",
            "go":
                "Go",

            "html":
                "HTML",
            "css":
                "CSS",

            "graphql":
                "GraphQL",

            "rest":
                "REST APIs",
            "restapi":
                "REST APIs",
            "restapis":
                "REST APIs",

            "github":
                "GitHub",
            "gitlab":
                "GitLab",
            "git":
                "Git",

            "kafka":
                "Apache Kafka",
            "apachekafka":
                "Apache Kafka",

            "rabbitmq":
                "RabbitMQ",

            "pytest":
                "PyTest",

            "jest":
                "Jest",

            "junit":
                "JUnit",

            "selenium":
                "Selenium",

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

            "tensorflow":
                "TensorFlow",

            "pytorch":
                "PyTorch",

            "machinelearning":
                "Machine Learning",

            "artificialintelligence":
                "Artificial Intelligence",

            "naturallanguageprocessing":
                "Natural Language Processing",

            "objectorientedprogrammingoop":
                "Object-Oriented Programming (OOP)",

            "objectorientedprogramming":
                "Object-Oriented Programming",

            "applicationprogramminglanguages":
                "Application Programming Languages",

            "databasemanagementsystems":
                "Database Management Systems",

            "webapplicationdevelopment":
                "Web Application Development",

            "softwaretesting":
                "Software Testing",

            "communicationskills":
                "Communication Skills",

            "problemsolving":
                "Problem Solving",

            "systemdesign":
                "System Design",
        }

        if lowered in known:
            return known[
                lowered
            ]

        if " " in value:
            return value

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
    # GEMINI JD EXTRACTION
    # ==========================================================

    async def _extract_jd(
        self,
        text: str,
    ) -> StructuredJD:

        gemini = (
            get_gemini_orchestrator()
        )

        if not gemini.is_available:
            return self._fallback_jd(
                text
            )

        prompt = """
Extract a structured job description from the supplied job description text.

Return ONLY valid JSON:

{
  "job_title": "string or null",
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

        parsed, _ = (
            await gemini.generate_json(
                prompt,
                {
                    "jd_text":
                        text[:15000]
                },
            )
        )

        if isinstance(
            parsed,
            dict,
        ):
            return StructuredJD.model_validate(
                parsed
            )

        raise HTTPException(
            status_code=502,
            detail="Invalid JD extraction response",
        )

    # ==========================================================
    # FALLBACK JD
    # ==========================================================

    def _fallback_jd(
        self,
        text: str,
    ) -> StructuredJD:

        common = [
            "Python",
            "SQL",
            "JavaScript",
            "React",
            "TypeScript",
            "Node.js",
            "FastAPI",
            "Java",
            "Spring",
            "AWS",
            "Azure",
            "GCP",
            "Docker",
            "Kubernetes",
            "MongoDB",
            "PostgreSQL",
            "Redis",
        ]

        lower = text.lower()

        found = [
            skill
            for skill in common
            if skill.lower()
            in lower
        ]

        return StructuredJD(
            summary=(
                text.strip()[:500]
                if text.strip()
                else None
            ),
            required_skills=found[:10],
            preferred_skills=found[10:],
            responsibilities=[],
            qualifications=[],
            education_requirements=[],
            certifications=[],
            nice_to_have=[],
            other_requirements=[],
        )
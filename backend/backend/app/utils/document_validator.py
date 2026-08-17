from __future__ import annotations

import re
from dataclasses import dataclass


# ============================================================
# VALIDATION RESULT
# ============================================================

@dataclass(frozen=True)
class DocumentValidationResult:
    is_valid: bool
    score: int
    reasons: tuple[str, ...]
    message: str


# ============================================================
# NORMALIZATION
# ============================================================

def _normalize(text: str) -> str:
    """
    Normalize extracted document text while preserving enough
    structure for document classification.
    """

    normalized = (text or "").strip().lower()

    normalized = (
        normalized
        .replace("\u00a0", " ")
        .replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
        .replace("–", "-")
        .replace("—", "-")
        .replace("\u2022", " ")
        .replace("•", " ")
    )

    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    )

    return normalized.strip()


def _normalized_lines(text: str) -> list[str]:
    """
    Preserve line boundaries because many JDs use structures such as:

        Role: Software Engineer
        Location: Remote
        Duration: 6 months
        Requirements: ...
    """

    return [
        _normalize(line)
        for line in (text or "").splitlines()
        if line.strip()
    ]


# ============================================================
# GENERIC HELPERS
# ============================================================

def _contains_any(
    text: str,
    terms: tuple[str, ...],
) -> bool:
    normalized = _normalize(text)

    return any(
        term in normalized
        for term in terms
    )


def _count_matches(
    text: str,
    terms: tuple[str, ...],
) -> int:
    normalized = _normalize(text)

    return sum(
        1
        for term in terms
        if term in normalized
    )


def _unique_matches(
    text: str,
    terms: tuple[str, ...],
) -> list[str]:
    normalized = _normalize(text)

    return [
        term
        for term in terms
        if term in normalized
    ]


def _count_heading_matches(
    text: str,
    terms: tuple[str, ...],
) -> int:
    """
    Count heading-style occurrences such as:

        Responsibilities
        Requirements:
        Required Skills:
        About the Role
    """

    lines = _normalized_lines(text)

    count = 0

    for line in lines:

        clean = line.strip(
            " :-|•"
        )

        for term in terms:

            if (
                clean == term
                or clean.startswith(
                    f"{term}:"
                )
                or clean.startswith(
                    f"{term} -"
                )
                or clean.startswith(
                    f"{term} |"
                )
            ):
                count += 1
                break

    return count


def _count_labeled_fields(
    text: str,
    labels: tuple[str, ...],
) -> int:
    """
    Detect inline structured fields such as:

        Role: ...
        Location: ...
        Duration: ...
        Stipend: ...
    """

    lines = _normalized_lines(text)

    count = 0

    for line in lines:

        for label in labels:

            if re.match(
                rf"^{re.escape(label)}\s*:",
                line,
            ):
                count += 1
                break

    return count


def _safe_score(value: int) -> int:
    return max(
        0,
        min(
            value,
            100,
        ),
    )


# ============================================================
# CONTACT INFORMATION
# ============================================================

def _has_email(text: str) -> bool:
    return bool(
        re.search(
            r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}",
            text or "",
            flags=re.IGNORECASE,
        )
    )


def _has_phone(text: str) -> bool:
    """
    Detect common phone number formats.

    The validator intentionally remains permissive because
    PDF extraction may introduce spaces or punctuation.
    """

    if not text:
        return False

    patterns = (
        r"(?<!\d)"
        r"\+?\d{1,3}"
        r"[\s.-]?"
        r"(?:\(\d{2,5}\)|\d{2,5})"
        r"[\s.-]?"
        r"\d{3,4}"
        r"[\s.-]?"
        r"\d{3,4}"
        r"(?!\d)",

        r"(?<!\d)"
        r"\d{10}"
        r"(?!\d)",
    )

    return any(
        re.search(
            pattern,
            text,
        )
        for pattern in patterns
    )


def _has_url(text: str) -> bool:
    return bool(
        re.search(
            r"(https?://|www\.)",
            text or "",
            flags=re.IGNORECASE,
        )
    )


# ============================================================
# PERSON NAME DETECTION
# ============================================================

NAME_STOP_WORDS = {
    "resume",
    "cv",
    "curriculum",
    "vitae",
    "profile",
    "summary",
    "professional",
    "objective",
    "skills",
    "technical",
    "experience",
    "work",
    "employment",
    "projects",
    "education",
    "certifications",
    "certification",
    "achievements",
    "awards",
    "publications",
    "developer",
    "engineer",
    "analyst",
    "manager",
    "intern",
    "internship",
    "architect",
    "designer",
    "consultant",
    "specialist",
    "associate",
    "administrator",
    "lead",
    "director",
    "requirements",
    "responsibilities",
    "qualifications",
    "position",
    "role",
    "company",
    "location",
    "salary",
    "stipend",
    "duration",
    "apply",
    "application",
    "opening",
    "opportunity",
    "candidates",
    "candidate",
    "students",
    "student",
    "placement",
    "team",
    "department",
}


# Lines/phrases which should never be interpreted as a person's name.
NAME_BLOCK_PHRASES = (
    "dear ",
    "hello ",
    "hi ",
    "hope you're",
    "hope you are",
    "looking forward",
    "we're excited",
    "we are excited",
    "please circulate",
    "please share",
    "candidate should",
    "candidates must",
    "eligible candidates",
    "placement cell",
    "placement team",
    "talent specialist",
    "human resources",
    "hr team",
    "recruitment team",
    "hiring team",
    "job opportunity",
    "career opportunity",
    "technical internship",
    "internship opportunity",
)


def _looks_like_person_name(
    text: str,
) -> bool:
    """
    Detect a likely candidate name near the top of a resume.

    This intentionally avoids treating recruiter/JD sentences
    such as "Dear Placement Cell Team" as a candidate name.
    """

    original_lines = [
        line.strip()
        for line in (text or "").splitlines()
        if line.strip()
    ]

    for original_line in original_lines[:12]:

        lowered = original_line.lower().strip()

        if any(
            lowered.startswith(
                phrase
            )
            for phrase in NAME_BLOCK_PHRASES
        ):
            continue

        if any(
            phrase in lowered
            for phrase in NAME_BLOCK_PHRASES
        ):
            continue

        cleaned = re.sub(
            r"[^a-zA-Z.' -]",
            " ",
            original_line,
        )

        cleaned = re.sub(
            r"\s+",
            " ",
            cleaned,
        ).strip()

        if not cleaned:
            continue

        words = cleaned.split()

        if not 2 <= len(words) <= 5:
            continue

        valid = True

        for word in words:

            normalized_word = (
                word
                .lower()
                .strip(
                    ".'-"
                )
            )

            if not normalized_word:
                valid = False
                break

            if (
                normalized_word
                in NAME_STOP_WORDS
            ):
                valid = False
                break

            if not re.fullmatch(
                r"[A-Za-z][A-Za-z.'-]*",
                word,
            ):
                valid = False
                break

        if not valid:
            continue

        # A name should not look like a long sentence.
        if (
            original_line.endswith(
                "."
            )
            or ":" in original_line
        ):
            continue

        return True

    return False


# ============================================================
# RESUME SIGNALS
# ============================================================

RESUME_SECTION_TERMS = (
    "summary",
    "professional summary",
    "career objective",
    "objective",
    "skills",
    "technical skills",
    "core skills",
    "competencies",
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "internship",
    "internships",
    "projects",
    "academic projects",
    "personal projects",
    "professional projects",
    "education",
    "academic background",
    "academic qualifications",
    "certifications",
    "certificates",
    "certification",
    "achievements",
    "awards",
    "publications",
    "training",
    "courses",
    "coursework",
    "leadership",
    "volunteering",
)


RESUME_STRONG_SECTION_TERMS = (
    "professional summary",
    "career objective",
    "work experience",
    "professional experience",
    "employment history",
    "technical skills",
    "academic qualifications",
    "academic background",
    "projects",
    "academic projects",
    "personal projects",
    "education",
    "certifications",
    "certificates",
    "achievements",
)


RESUME_IDENTITY_TERMS = (
    "linkedin",
    "github",
    "portfolio",
    "curriculum vitae",
    "resume",
    "cv",
)


RESUME_CAREER_TERMS = (
    "developed",
    "designed",
    "implemented",
    "built",
    "created",
    "worked",
    "responsible for",
    "managed",
    "engineered",
    "tested",
    "deployed",
    "automated",
    "optimized",
    "maintained",
    "analyzed",
    "integrated",
    "delivered",
    "collaborated",
    "contributed",
)


RESUME_NEGATIVE_TERMS = (
    "test-taker guidelines",
    "test taker guidelines",
    "assessment guidelines",
    "assessment instructions",
    "test instructions",
    "exam instructions",
    "online assessment",
    "system requirements",
    "webcam",
    "microphone permissions",
    "microphone permission",
    "camera permission",
    "camera permissions",
    "proctored",
    "proctoring",
    "question paper",
    "question booklet",
    "invoice",
    "invoice number",
    "amount due",
    "statement of account",
    "bank statement",
    "account statement",
    "user manual",
    "installation guide",
    "terms and conditions",
)


# ============================================================
# JOB DESCRIPTION SIGNALS
# ============================================================

# Explicit/classic JD language.
STRONG_JD_PHRASES = (
    "job description",
    "job summary",
    "role description",
    "position description",
    "position overview",
    "role overview",
    "job responsibilities",
    "required qualifications",
    "preferred qualifications",
    "required skills",
    "preferred skills",
    "experience required",
    "education requirements",
    "employment type",
    "nice to have",
    "what you'll do",
    "what you will do",
    "what you'll bring",
    "what you will bring",
    "what we're looking for",
    "what we are looking for",
    "who we're looking for",
    "who we are looking for",
    "about the role",
    "about the position",
    "about the job",
    "candidate requirements",
    "role requirements",
    "key qualifications",
    "qualifications required",
    "the successful candidate",
    "job opening",
    "job opportunity",
    "career opportunity",
    "internship opportunity",
    "technical internship opportunity",
    "career opportunities",
)


# Traditional JD headings.
JD_HEADING_TERMS = (
    "job description",
    "job summary",
    "role description",
    "position overview",
    "role overview",
    "responsibilities",
    "key responsibilities",
    "core responsibilities",
    "duties",
    "requirements",
    "required skills",
    "preferred skills",
    "qualifications",
    "required qualifications",
    "preferred qualifications",
    "experience required",
    "education requirements",
    "employment type",
    "nice to have",
    "what you'll do",
    "what you will do",
    "what you'll bring",
    "what you will bring",
    "what we're looking for",
    "what we are looking for",
    "about the role",
    "about the position",
    "candidate requirements",
)


# Role/job title vocabulary.
JD_ROLE_TERMS = (
    "software engineer",
    "software developer",
    "software development engineer",
    "software development engineer in test",
    "developer",
    "engineer",
    "intern",
    "internship",
    "apprentice",
    "apprenticeship",
    "analyst",
    "data scientist",
    "data analyst",
    "product manager",
    "project manager",
    "designer",
    "consultant",
    "administrator",
    "architect",
    "specialist",
    "associate",
    "manager",
    "lead",
    "director",
    "security engineer",
    "data engineer",
    "machine learning engineer",
    "frontend developer",
    "backend developer",
    "full stack developer",
    "full-stack developer",
    "qa engineer",
    "quality assurance",
    "test engineer",
    "sdet",
)


# Conventional requirement language.
JD_REQUIREMENT_TERMS = (
    "experience in",
    "experience with",
    "years of experience",
    "knowledge of",
    "knowledge in",
    "proficiency in",
    "proficient in",
    "familiarity with",
    "strong knowledge",
    "strong understanding",
    "strong hold on",
    "ability to",
    "capable of",
    "skilled in",
    "skills in",
    "expertise in",
    "must have",
    "should have",
    "qualification",
    "qualifications",
    "academic record",
    "academic records",
    "academic background",
    "programming language",
    "programming languages",
    "technical skills",
    "technical knowledge",
    "algorithms",
    "data structures",
    "software development",
    "problem-solving",
    "problem solving",
    "communication skills",
    "collaboration",
    "teamwork",
    "work collaboratively",
    "degree",
    "bachelor",
    "master",
    "computer science",
    "prerequisite",
    "prerequisites",
    "candidates must",
    "candidate must",
    "must be",
    "is required",
    "are required",
    "required for",
    "eligible candidates",
)


# Recruitment/job-posting language.
JD_RECRUITMENT_TERMS = (
    "apply now",
    "apply here",
    "how to apply",
    "application process",
    "application deadline",
    "career opportunity",
    "career opportunities",
    "job opportunity",
    "job opportunities",
    "job opening",
    "job openings",
    "employment type",
    "full-time",
    "full time",
    "part-time",
    "part time",
    "remote",
    "hybrid",
    "on-site",
    "onsite",
    "salary",
    "stipend",
    "compensation",
    "location",
    "duration",
    "conversion",
    "full-time conversion",
    "offer",
    "referral",
    "referrals",
    "eligible candidates",
    "students",
    "student",
    "placement",
    "circulate",
    "institution",
    "interested candidates",
    "recruiter",
    "talent specialist",
    "hiring",
)


# Structured fields frequently used by placement/internship JDs.
JD_LABELED_FIELD_TERMS = (
    "role",
    "position",
    "job title",
    "title",
    "location",
    "duration",
    "stipend",
    "salary",
    "employment type",
    "experience",
    "requirements",
    "qualifications",
    "responsibilities",
)


# Announcement-specific language.
JD_ANNOUNCEMENT_TERMS = (
    "internship opportunity",
    "technical internship opportunity",
    "opportunity for students",
    "opportunity among students",
    "for your students",
    "eligible candidates",
    "interested candidates",
    "placement cell",
    "placement team",
    "please circulate",
    "please share",
    "share us a list",
    "list of interested candidates",
    "we're excited to announce",
    "we are excited to announce",
    "excited to announce",
    "reaching out from",
    "talent specialist",
    "fast-track the process",
    "fast track the process",
    "referrals from your institution",
    "real shot at a full-time offer",
    "full-time offer",
    "conversion for exceptional performers",
)


# Very strong candidate requirement phrases often seen in
# internship/placement announcements.
JD_CANDIDATE_REQUIREMENT_TERMS = (
    "candidates must",
    "candidate must",
    "must have",
    "must be",
    "is a must",
    "are a must",
    "is required",
    "are required",
    "prerequisite",
    "prerequisites",
    "required prerequisite",
    "eligible candidates",
    "own laptop",
    "reliable internet",
    "internet connection",
    "power backup",
    "inverter",
    "ups",
    "eligible to apply",
)


# Strong signs that the file is a resume rather than a JD.
JD_NEGATIVE_RESUME_TERMS = (
    "my work experience",
    "my projects",
    "my skills",
    "candidate profile",
    "personal profile",
    "career objective",
    "professional summary",
    "employment history",
    "professional experience",
    "academic qualifications",
    "curriculum vitae",
    "resume",
    "cv",
    "linkedin",
    "github",
    "portfolio",
    "date of birth",
    "declaration",
    "signature",
)


# ============================================================
# JD STRUCTURE HELPERS
# ============================================================

def _extract_role_field(
    text: str,
) -> bool:
    """
    Detect structured role fields such as:

        Role: Software Engineer
        Position: SDET Intern
        Job Title: Data Analyst
    """

    lines = _normalized_lines(text)

    role_labels = (
        "role",
        "position",
        "job title",
        "title",
        "opportunity",
    )

    for line in lines:

        for label in role_labels:

            match = re.match(
                rf"^{re.escape(label)}\s*:\s*(.+)$",
                line,
            )

            if match:

                value = match.group(
                    1
                ).strip()

                if (
                    value
                    and len(value) >= 2
                ):
                    return True

    return False


def _extract_contact_name_like_jd(
    text: str,
) -> bool:
    """
    Detect recruiter/company announcement language without
    treating it as a candidate identity.
    """

    return _contains_any(
        text,
        (
            "dear placement",
            "placement cell",
            "placement team",
            "talent specialist",
            "recruitment team",
            "hiring team",
            "hr team",
        ),
    )


# ============================================================
# SCORE BUILDERS
# ============================================================

def _get_resume_score(
    text: str,
) -> tuple[int, list[str]]:

    score = 0
    reasons: list[str] = []

    has_name = _looks_like_person_name(
        text
    )

    has_email = _has_email(
        text
    )

    has_phone = _has_phone(
        text
    )

    has_url = _has_url(
        text
    )

    if has_name:
        score += 30
        reasons.append(
            "candidate name detected"
        )

    if has_email:
        score += 30
        reasons.append(
            "email address detected"
        )

    elif has_phone:
        score += 20
        reasons.append(
            "phone number detected"
        )

    if has_url:
        score += 8
        reasons.append(
            "profile URL detected"
        )

    strong_sections = _count_heading_matches(
        text,
        RESUME_STRONG_SECTION_TERMS,
    )

    generic_sections = _count_matches(
        text,
        RESUME_SECTION_TERMS,
    )

    if strong_sections:
        score += min(
            strong_sections * 12,
            48,
        )

        reasons.append(
            f"{strong_sections} strong resume section(s) detected"
        )

    if generic_sections:
        score += min(
            generic_sections * 4,
            20,
        )

        reasons.append(
            f"{generic_sections} resume section signal(s) detected"
        )

    career_matches = _count_matches(
        text,
        RESUME_CAREER_TERMS,
    )

    if career_matches:
        score += min(
            career_matches * 2,
            20,
        )

        reasons.append(
            f"{career_matches} career-content signal(s) detected"
        )

    return (
        _safe_score(score),
        reasons,
    )


def _get_jd_score(
    text: str,
) -> tuple[int, list[str]]:

    score = 0
    reasons: list[str] = []

    strong_matches = _unique_matches(
        text,
        STRONG_JD_PHRASES,
    )

    heading_matches = _count_heading_matches(
        text,
        JD_HEADING_TERMS,
    )

    requirement_matches = _count_matches(
        text,
        JD_REQUIREMENT_TERMS,
    )

    candidate_requirement_matches = _count_matches(
        text,
        JD_CANDIDATE_REQUIREMENT_TERMS,
    )

    role_matches = _count_matches(
        text,
        JD_ROLE_TERMS,
    )

    recruitment_matches = _count_matches(
        text,
        JD_RECRUITMENT_TERMS,
    )

    announcement_matches = _count_matches(
        text,
        JD_ANNOUNCEMENT_TERMS,
    )

    labeled_fields = _count_labeled_fields(
        text,
        JD_LABELED_FIELD_TERMS,
    )

    role_field = _extract_role_field(
        text
    )

    # --------------------------------------------------------
    # Explicit JD wording
    # --------------------------------------------------------

    if strong_matches:

        score += min(
            len(strong_matches) * 14,
            56,
        )

        reasons.append(
            f"{len(strong_matches)} strong JD marker(s) detected"
        )

    # --------------------------------------------------------
    # Conventional headings
    # --------------------------------------------------------

    if heading_matches:

        score += min(
            heading_matches * 9,
            36,
        )

        reasons.append(
            f"{heading_matches} JD heading(s) detected"
        )

    # --------------------------------------------------------
    # Requirement language
    # --------------------------------------------------------

    if requirement_matches:

        score += min(
            requirement_matches * 3,
            24,
        )

        reasons.append(
            f"{requirement_matches} requirement signal(s) detected"
        )

    # --------------------------------------------------------
    # Explicit candidate requirements
    # --------------------------------------------------------

    if candidate_requirement_matches:

        score += min(
            candidate_requirement_matches * 7,
            28,
        )

        reasons.append(
            f"{candidate_requirement_matches} candidate-requirement signal(s) detected"
        )

    # --------------------------------------------------------
    # Role terminology
    # --------------------------------------------------------

    if role_matches:

        score += min(
            role_matches * 3,
            18,
        )

        reasons.append(
            f"{role_matches} role signal(s) detected"
        )

    # --------------------------------------------------------
    # Recruitment/posting language
    # --------------------------------------------------------

    if recruitment_matches:

        score += min(
            recruitment_matches * 3,
            21,
        )

        reasons.append(
            f"{recruitment_matches} recruitment signal(s) detected"
        )

    # --------------------------------------------------------
    # Internship/campus announcement language
    # --------------------------------------------------------

    if announcement_matches:

        score += min(
            announcement_matches * 6,
            30,
        )

        reasons.append(
            f"{announcement_matches} job-announcement signal(s) detected"
        )

    # --------------------------------------------------------
    # Structured fields
    # --------------------------------------------------------

    if labeled_fields:

        score += min(
            labeled_fields * 5,
            25,
        )

        reasons.append(
            f"{labeled_fields} structured job field(s) detected"
        )

    if role_field:

        score += 8

        reasons.append(
            "explicit role field detected"
        )

    return (
        _safe_score(score),
        reasons,
    )


# ============================================================
# RESUME VALIDATION
# ============================================================

def validate_resume_document(
    text: str,
    filename: str | None = None,
) -> DocumentValidationResult:

    normalized = _normalize(
        text
    )

    if not normalized:

        return DocumentValidationResult(
            is_valid=False,
            score=0,
            reasons=(
                "document contains no readable text",
            ),
            message=(
                "This file does not contain readable resume text. "
                "Please upload your actual resume."
            ),
        )

    resume_score, resume_reasons = (
        _get_resume_score(
            text
        )
    )

    jd_score, jd_reasons = (
        _get_jd_score(
            text
        )
    )

    reasons = [
        *resume_reasons,
        *jd_reasons,
    ]

    # ========================================================
    # NON-RESUME DOCUMENT CHECK
    # ========================================================

    negative_matches = _unique_matches(
        text,
        RESUME_NEGATIVE_TERMS,
    )

    if len(
        negative_matches
    ) >= 2:

        reasons.append(
            f"{len(negative_matches)} non-resume signal(s) detected"
        )

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                resume_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file does not appear to be a resume. "
                "It looks more like an assessment, instruction document, "
                "manual, statement, invoice, or another non-resume file. "
                "Please upload your actual resume."
            ),
        )

    # ========================================================
    # JD CROSS-CHECK
    # ========================================================
    #
    # This is deliberately strong.
    #
    # A genuine JD uploaded into the resume field should fail,
    # even when that JD happens to contain a phone number,
    # email address, skills, experience, or education.
    # ========================================================

    strong_jd_count = len(
        _unique_matches(
            text,
            STRONG_JD_PHRASES,
        )
    )

    jd_heading_count = _count_heading_matches(
        text,
        JD_HEADING_TERMS,
    )

    announcement_count = _count_matches(
        text,
        JD_ANNOUNCEMENT_TERMS,
    )

    candidate_requirement_count = _count_matches(
        text,
        JD_CANDIDATE_REQUIREMENT_TERMS,
    )

    structured_job_fields = _count_labeled_fields(
        text,
        JD_LABELED_FIELD_TERMS,
    )

    has_role_field = _extract_role_field(
        text
    )

    has_jd_announcement_context = (
        announcement_count >= 2
        and (
            candidate_requirement_count >= 1
            or structured_job_fields >= 2
            or has_role_field
        )
    )

    clearly_jd = (
        (
            strong_jd_count >= 3
            and jd_score >= 50
        )
        or (
            strong_jd_count >= 2
            and jd_heading_count >= 3
            and jd_score >= 50
        )
        or (
            has_jd_announcement_context
            and jd_score >= 45
        )
        or (
            candidate_requirement_count >= 2
            and (
                has_role_field
                or structured_job_fields >= 2
            )
            and jd_score >= 45
        )
    )

    # When resume-like evidence is extremely strong, demand
    # additional JD evidence before rejecting.
    #
    # This prevents ordinary resumes containing words such as
    # engineer/developer/experience/skills from being rejected.
    if resume_score >= 75:

        clearly_jd = (
            (
                strong_jd_count >= 4
                and jd_heading_count >= 3
                and jd_score >= 65
            )
            or (
                has_jd_announcement_context
                and jd_score >= 60
            )
        )

    if clearly_jd:

        reasons.append(
            "document has strong job-description structure"
        )

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                resume_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file appears to be a job description rather than a resume. "
                "Please upload the candidate's actual resume."
            ),
        )

    # ========================================================
    # RESUME IDENTITY
    # ========================================================

    has_name = _looks_like_person_name(
        text
    )

    has_email = _has_email(
        text
    )

    has_phone = _has_phone(
        text
    )

    strong_resume_sections = (
        _count_heading_matches(
            text,
            RESUME_STRONG_SECTION_TERMS,
        )
    )

    generic_resume_sections = (
        _count_matches(
            text,
            RESUME_SECTION_TERMS,
        )
    )

    has_resume_structure = (
        strong_resume_sections >= 2
        or generic_resume_sections >= 4
    )

    valid_identity = (
        has_name
        and (
            has_email
            or (
                has_phone
                and has_resume_structure
            )
        )
    )

    if not valid_identity:

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                resume_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file does not appear to be a resume. "
                "A valid resume should contain a clear candidate name "
                "and contact information such as an email address or phone number."
            ),
        )

    # ========================================================
    # RESUME STRUCTURE
    # ========================================================

    career_sections = _count_matches(
        text,
        (
            "skills",
            "technical skills",
            "experience",
            "work experience",
            "professional experience",
            "employment",
            "employment history",
            "projects",
            "academic projects",
            "personal projects",
            "education",
            "certifications",
            "certificates",
            "training",
            "internship",
            "internships",
            "achievements",
            "awards",
        ),
    )

    if (
        strong_resume_sections < 2
        and career_sections < 4
    ):

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                resume_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file contains candidate identity information "
                "but does not contain enough resume structure. "
                "Please upload a resume containing skills, experience, "
                "projects, education, certifications, or similar sections."
            ),
        )

    # ========================================================
    # CAREER CONTENT
    # ========================================================

    career_content = _count_matches(
        text,
        RESUME_CAREER_TERMS,
    )

    if (
        career_content < 2
        and career_sections < 5
    ):

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                resume_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file does not contain enough professional or "
                "academic career information to be recognized as a resume."
            ),
        )

    # ========================================================
    # FINAL RESUME SCORE
    # ========================================================

    if resume_score < 50:

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                resume_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file does not appear to be a valid resume. "
                "Please upload your actual resume."
            ),
        )

    return DocumentValidationResult(
        is_valid=True,
        score=_safe_score(
            resume_score
        ),
        reasons=tuple(
            reasons
        ),
        message=(
            "Resume document validated successfully."
        ),
    )


# ============================================================
# JOB DESCRIPTION VALIDATION
# ============================================================

def validate_jd_document(
    text: str,
    filename: str | None = None,
) -> DocumentValidationResult:

    normalized = _normalize(
        text
    )

    if not normalized:

        return DocumentValidationResult(
            is_valid=False,
            score=0,
            reasons=(
                "document contains no readable text",
            ),
            message=(
                "This file does not contain readable job-description text."
            ),
        )

    jd_score, jd_reasons = (
        _get_jd_score(
            text
        )
    )

    resume_score, resume_reasons = (
        _get_resume_score(
            text
        )
    )

    reasons = [
        *jd_reasons,
        *resume_reasons,
    ]

    # ========================================================
    # RESUME CROSS-CHECK
    # ========================================================
    #
    # A real resume accidentally uploaded to the JD section
    # should be rejected.
    #
    # However, generic terms such as "experience", "skills",
    # "engineer", and "education" are NOT enough by themselves.
    # ========================================================

    resume_negative_matches = (
        _unique_matches(
            text,
            JD_NEGATIVE_RESUME_TERMS,
        )
    )

    has_name = _looks_like_person_name(
        text
    )

    has_email = _has_email(
        text
    )

    has_phone = _has_phone(
        text
    )

    resume_identity = (
        has_name
        and (
            has_email
            or has_phone
        )
    )

    resume_sections = (
        _count_heading_matches(
            text,
            RESUME_STRONG_SECTION_TERMS,
        )
    )

    generic_resume_sections = (
        _count_matches(
            text,
            RESUME_SECTION_TERMS,
        )
    )

    strong_resume_document = (
        resume_identity
        and (
            resume_sections >= 3
            or generic_resume_sections >= 5
        )
        and resume_score >= 70
    )

    # --------------------------------------------------------
    # Detect strong resume before accepting JD.
    # --------------------------------------------------------

    strong_jd_markers = len(
        _unique_matches(
            text,
            STRONG_JD_PHRASES,
        )
    )

    announcement_count = _count_matches(
        text,
        JD_ANNOUNCEMENT_TERMS,
    )

    candidate_requirement_count = _count_matches(
        text,
        JD_CANDIDATE_REQUIREMENT_TERMS,
    )

    structured_job_fields = (
        _count_labeled_fields(
            text,
            JD_LABELED_FIELD_TERMS,
        )
    )

    has_role_field = _extract_role_field(
        text
    )

    announcement_structure = (
        announcement_count >= 2
        and (
            candidate_requirement_count >= 1
            or structured_job_fields >= 2
            or has_role_field
        )
    )

    # Only classify as resume when resume evidence is
    # materially stronger than JD evidence.
    if (
        strong_resume_document
        and not announcement_structure
        and strong_jd_markers < 2
        and resume_score > jd_score + 10
    ):

        reasons.append(
            "document has stronger resume evidence than JD evidence"
        )

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                jd_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file appears to be a resume rather than a job description. "
                "Please upload the actual job description."
            ),
        )

    # Strong unmistakable resume-only terminology.
    if (
        len(
            resume_negative_matches
        ) >= 3
        and not (
            jd_score >= 55
            and (
                strong_jd_markers >= 2
                or announcement_structure
            )
        )
    ):

        reasons.append(
            f"{len(resume_negative_matches)} strong resume signal(s) detected"
        )

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                jd_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file appears to be a resume rather than a job description. "
                "Please upload the actual job description."
            ),
        )

    # ========================================================
    # ROLE SIGNAL
    # ========================================================

    role_matches = _count_matches(
        text,
        JD_ROLE_TERMS,
    )

    has_role_signal = (
        role_matches >= 1
        or has_role_field
        or _contains_any(
            text,
            (
                "job title",
                "position title",
                "role title",
                "position:",
                "role:",
                "title:",
                "about this role",
                "about the role",
                "career opportunity",
                "career opportunities",
                "job opportunity",
                "job opportunities",
                "open position",
                "open role",
                "technology division",
                "technology apprenticeship",
                "apprenticeship program",
                "internship opportunity",
                "technical internship",
            ),
        )
    )

    # ========================================================
    # REQUIREMENT / RESPONSIBILITY SIGNAL
    # ========================================================

    strong_jd_matches = len(
        _unique_matches(
            text,
            STRONG_JD_PHRASES,
        )
    )

    heading_matches = _count_heading_matches(
        text,
        JD_HEADING_TERMS,
    )

    requirement_matches = _count_matches(
        text,
        JD_REQUIREMENT_TERMS,
    )

    candidate_requirement_matches = (
        _count_matches(
            text,
            JD_CANDIDATE_REQUIREMENT_TERMS,
        )
    )

    recruitment_matches = _count_matches(
        text,
        JD_RECRUITMENT_TERMS,
    )

    announcement_matches = _count_matches(
        text,
        JD_ANNOUNCEMENT_TERMS,
    )

    has_requirement_signal = (
        strong_jd_matches >= 1
        or heading_matches >= 1
        or requirement_matches >= 2
        or candidate_requirement_matches >= 1
        or announcement_matches >= 2
    )

    # ========================================================
    # IMPORTANT:
    #
    # A recruiter/placement announcement may not contain a
    # "Requirements" heading at all.
    #
    # Example:
    #
    # Role: SDET Intern
    # Location: Fully Remote
    # Duration: 6 months
    # Stipend: ₹25,000/month
    #
    # Candidates must have their own laptop.
    # Reliable internet connection is required.
    #
    # This is still a valid JD/job opportunity.
    # ========================================================

    structured_announcement_jd = (
        has_role_field
        and (
            structured_job_fields >= 2
        )
        and (
            candidate_requirement_matches >= 1
            or recruitment_matches >= 2
            or announcement_matches >= 1
            or role_matches >= 1
        )
    )

    internship_announcement_jd = (
        (
            "internship"
            in normalized
        )
        and (
            role_matches >= 1
        )
        and (
            candidate_requirement_matches >= 1
            or recruitment_matches >= 2
            or announcement_matches >= 1
            or _contains_any(
                text,
                (
                    "duration",
                    "stipend",
                    "full-time conversion",
                    "full time conversion",
                    "students",
                    "eligible candidates",
                ),
            )
        )
    )

    conventional_jd = (
        (
            strong_jd_matches >= 2
            and jd_score >= 40
        )
        or (
            heading_matches >= 2
            and (
                requirement_matches >= 2
                or candidate_requirement_matches >= 1
            )
            and jd_score >= 40
        )
        or (
            requirement_matches >= 5
            and role_matches >= 1
            and jd_score >= 40
        )
    )

    # ========================================================
    # ROLE MUST EXIST
    # ========================================================

    if not has_role_signal:

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                jd_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file does not appear to be a job description "
                "because no clear role, position, or opportunity "
                "information was found."
            ),
        )

    # ========================================================
    # REQUIREMENT / JOB-CONTEXT MUST EXIST
    # ========================================================

    if not has_requirement_signal:

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                jd_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file does not contain enough job requirements, "
                "qualifications, responsibilities, or candidate "
                "eligibility information to be recognized as a job description."
            ),
        )

    # ========================================================
    # FINAL JD CLASSIFICATION
    # ========================================================

    jd_is_valid = (
        conventional_jd
        or structured_announcement_jd
        or internship_announcement_jd
        or (
            announcement_structure
            and role_matches >= 1
            and jd_score >= 35
        )
    )

    if not jd_is_valid:

        return DocumentValidationResult(
            is_valid=False,
            score=_safe_score(
                jd_score
            ),
            reasons=tuple(
                reasons
            ),
            message=(
                "This file does not appear to be a complete job description. "
                "Please upload a document containing the target role and "
                "its responsibilities, requirements, qualifications, "
                "candidate prerequisites, or employment details."
            ),
        )

    return DocumentValidationResult(
        is_valid=True,
        score=_safe_score(
            jd_score
        ),
        reasons=tuple(
            reasons
        ),
        message=(
            "Job description document validated successfully."
        ),
    )
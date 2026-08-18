import hashlib
import re
import uuid
from datetime import datetime, timezone


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def generate_id() -> str:
    return str(uuid.uuid4())


def normalize_text(text: str) -> str:
    text = text.lower()
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def hash_content(text: str) -> str:
    normalized = normalize_text(text)

    return hashlib.sha256(
        normalized.encode("utf-8")
    ).hexdigest()


def normalize_question_text(text: str) -> str:
    text = text.lower()

    text = re.sub(
        r"[^\w\s]",
        "",
        text,
    )

    text = re.sub(
        r"\s+",
        " ",
        text,
    )

    return text.strip()


# ============================================================
# DETERMINISTIC SKILL ALIASES
# ============================================================

SKILL_ALIASES: dict[str, str] = {
    # --------------------------------------------------------
    # Python
    # --------------------------------------------------------

    "py": "python",
    "python3": "python",

    # --------------------------------------------------------
    # JavaScript
    # --------------------------------------------------------

    "js": "javascript",
    "ecmascript": "javascript",
    "javascriptes6": "javascript",

    # --------------------------------------------------------
    # TypeScript
    # --------------------------------------------------------

    "ts": "typescript",

    # --------------------------------------------------------
    # React
    # --------------------------------------------------------
    #
    # IMPORTANT:
    # normalize_skill_raw() returns "reactjs".
    # The database alias layer can then map:
    #
    # reactjs -> react
    #
    # This preserves the two-stage normalization design.
    # --------------------------------------------------------

    "reactjs": "reactjs",

    # --------------------------------------------------------
    # Node
    # --------------------------------------------------------
    #
    # normalize_skill_raw() returns "nodejs".
    # The database alias layer can then map:
    #
    # nodejs -> node
    #
    # This is required by the existing alias tests.
    # --------------------------------------------------------

    "nodejs": "nodejs",
    "node": "nodejs",

    # --------------------------------------------------------
    # PostgreSQL
    # --------------------------------------------------------

    "postgres": "postgresql",
    "postgresql": "postgresql",
    "psql": "postgresql",

    # --------------------------------------------------------
    # MongoDB
    # --------------------------------------------------------

    "mongo": "mongodb",
    "mongodb": "mongodb",

    # --------------------------------------------------------
    # Kubernetes
    # --------------------------------------------------------

    "k8s": "kubernetes",

    # --------------------------------------------------------
    # C#
    # --------------------------------------------------------

    "csharp": "c#",

    # --------------------------------------------------------
    # C++
    # --------------------------------------------------------

    "cpp": "c++",
    "cplusplus": "c++",

    # --------------------------------------------------------
    # .NET
    # --------------------------------------------------------

    "dotnet": ".net",
    "dotnetcore": ".net",

    # --------------------------------------------------------
    # SQL Server
    # --------------------------------------------------------

    "mssql": "sqlserver",
    "microsoftsqlserver": "sqlserver",

    # --------------------------------------------------------
    # AWS
    # --------------------------------------------------------

    "amazonwebservices": "aws",

    # --------------------------------------------------------
    # GCP
    # --------------------------------------------------------

    "googlecloud": "gcp",
    "googlecloudplatform": "gcp",

    # --------------------------------------------------------
    # Azure
    # --------------------------------------------------------

    "microsoftazure": "azure",

    # --------------------------------------------------------
    # Machine Learning
    # --------------------------------------------------------

    "ml": "machinelearning",

    # --------------------------------------------------------
    # Artificial Intelligence
    # --------------------------------------------------------

    "ai": "artificialintelligence",

    # --------------------------------------------------------
    # NLP
    # --------------------------------------------------------

    "nlp": "naturallanguageprocessing",

    # --------------------------------------------------------
    # LLM
    # --------------------------------------------------------

    "llm": "largelanguagemodels",
    "llms": "largelanguagemodels",

    # --------------------------------------------------------
    # Data Science
    # --------------------------------------------------------

    "sklearn": "scikit-learn",
    "scikitlearn": "scikit-learn",

    # --------------------------------------------------------
    # Deep Learning
    # --------------------------------------------------------

    "tf": "tensorflow",
    "torch": "pytorch",

    # --------------------------------------------------------
    # API
    # --------------------------------------------------------

    "restapi": "rest",
    "restapis": "rest",
    "restfulapi": "rest",
    "restfulapis": "rest",

    # --------------------------------------------------------
    # Testing
    # --------------------------------------------------------

    "unit testing": "unittesting",
    "unit-testing": "unittesting",
    "integration testing": "integrationtesting",
    "integration-testing": "integrationtesting",

    # --------------------------------------------------------
    # IMPORTANT CATEGORY NORMALIZATIONS
    # --------------------------------------------------------

    "objectorientedprogrammingoop":
        "objectorientedprogrammingoop",

    "object-orientedprogrammingoop":
        "objectorientedprogrammingoop",

    "objectorientedprogramming":
        "objectorientedprogramming",

    "object-orientedprogramming":
        "objectorientedprogramming",

    "applicationprogramminglanguages":
        "applicationprogramminglanguages",

    "applicationprogramminglanguage":
        "applicationprogramminglanguages",

    "databasemanagementsystems":
        "databasemanagementsystems",

    "databasemanagementsystem":
        "databasemanagementsystems",

    "webapplicationdevelopment":
        "webapplicationdevelopment",

    "softwaretesting":
        "softwaretesting",

    "communicationskills":
        "communicationskills",

    "problemsolving":
        "problemsolving",

    "systemdesign":
        "systemdesign",
}


def normalize_skill_raw(skill: str) -> str:
    """
    Convert a skill into a stable comparison key.

    This function performs only deterministic formatting/
    normalization. Database-backed aliases are resolved later
    by SkillNormalizationService.

    Examples:

        React.js
            -> reactjs

        node.js
            -> nodejs

        Postgres
            -> postgresql

        K8s
            -> kubernetes

        Object-Oriented Programming (OOP)
            -> objectorientedprogrammingoop
    """

    if not skill:
        return ""

    skill = str(skill).lower().strip()

    # Normalize unicode punctuation.
    skill = (
        skill
        .replace("–", "-")
        .replace("—", "-")
        .replace("’", "'")
        .replace("`", "")
    )

    # Preserve characters needed by technical names while
    # removing unrelated punctuation.
    skill = re.sub(
        r"[^\w\s.#+\-/]",
        "",
        skill,
    )

    # Treat hyphens and underscores as separators.
    skill = skill.replace(
        "-",
        " ",
    )

    skill = skill.replace(
        "_",
        " ",
    )

    # Collapse whitespace.
    skill = re.sub(
        r"\s+",
        " ",
        skill,
    ).strip()

    # Remove dots/spaces for the comparison key.
    compact = (
        skill
        .replace(".", "")
        .replace(" ", "")
    )

    # Resolve deterministic aliases.
    canonical = SKILL_ALIASES.get(
        compact
    )

    if canonical:
        return canonical

    return compact
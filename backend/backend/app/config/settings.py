import json
import os
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import (
    BaseSettings,
    SettingsConfigDict,
)


_BACKEND_ROOT = (
    Path(__file__)
    .resolve()
    .parents[2]
)

_ENV_FILE = _BACKEND_ROOT / ".env"

LOCAL_DEV_DEFAULT_JWT_SECRET = (
    "dev-local-only-secret-do-not-use-in-production"
)


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ==========================================================
    # DATABASE
    # ==========================================================

    mongodb_uri: str = (
        "mongodb://localhost:27017"
    )

    database_name: str = (
        "interview_platform"
    )

    # ==========================================================
    # GEMINI
    # ==========================================================

    gemini_api_key_1: str = ""
    gemini_api_key_2: str = ""
    gemini_api_key_3: str = ""

    gemini_model: str = (
        "gemini-3.6-flash"
    )

    # ==========================================================
    # GROQ
    # ==========================================================

    groq_api_key: str = ""

    groq_model: str = (
        "openai/gpt-oss-120b"
    )

    # ==========================================================
    # AI PROVIDER ROUTING
    # ==========================================================

    ai_primary_provider: str = "groq"

    ai_fallback_provider: str = "gemini"

    # ==========================================================
    # JWT
    # ==========================================================

    jwt_secret: str = (
        LOCAL_DEV_DEFAULT_JWT_SECRET
    )

    jwt_algorithm: str = "HS256"

    jwt_expire_minutes: int = 1440

    # ==========================================================
    # CORS
    # ==========================================================
    #
    # Local defaults:
    #
    # http://localhost:3000
    # http://127.0.0.1:3000
    # http://localhost:5173
    # http://127.0.0.1:5173
    #
    # In Render, set CORS_ORIGINS explicitly to include:
    #
    # https://interview-ai-career.vercel.app
    #
    # Example:
    #
    # CORS_ORIGINS=https://interview-ai-career.vercel.app,http://localhost:3000,http://127.0.0.1:3000,http://localhost:5173,http://127.0.0.1:5173
    #
    # Or JSON:
    #
    # CORS_ORIGINS=["https://interview-ai-career.vercel.app","http://localhost:3000"]
    #

    cors_origins: str = (
        "http://localhost:3000,"
        "http://127.0.0.1:3000,"
        "http://localhost:5173,"
        "http://127.0.0.1:5173"
    )

    # ==========================================================
    # UPLOAD SETTINGS
    # ==========================================================

    max_upload_bytes: int = (
        5 * 1024 * 1024
    )

    allowed_extensions: tuple[
        str,
        ...
    ] = (
        ".pdf",
        ".docx",
        ".txt",
        ".rtf",
        ".md",
    )

    # ==========================================================
    # JWT VALIDATION
    # ==========================================================

    @field_validator(
        "jwt_secret"
    )
    @classmethod
    def validate_jwt_secret(
        cls,
        value: str,
    ) -> str:

        normalized = (
            str(value)
            .strip()
        )

        if not normalized:
            raise ValueError(
                "JWT_SECRET must not be empty. "
                "Set it in the environment for each deployment."
            )

        is_production = (
            os.getenv(
                "APP_ENV",
                "",
            )
            .strip()
            .lower()
            == "production"
            or
            os.getenv(
                "ENVIRONMENT",
                "",
            )
            .strip()
            .lower()
            == "production"
        )

        insecure_defaults = {
            "change-me-in-production",
            (
                "change-me-in-production-"
                "use-long-random-string"
            ),
            "dev-secret",
            LOCAL_DEV_DEFAULT_JWT_SECRET,
        }

        if (
            is_production
            and normalized in insecure_defaults
        ):
            raise ValueError(
                "Production JWT_SECRET must be set "
                "to a unique environment-managed value."
            )

        return normalized

    # ==========================================================
    # CORS VALIDATION / NORMALIZATION
    # ==========================================================

    @field_validator(
        "cors_origins",
        mode="before",
    )
    @classmethod
    def parse_cors_origins(
        cls,
        value,
    ) -> str:

        if value is None:
            return (
                "http://localhost:3000,"
                "http://127.0.0.1:3000,"
                "http://localhost:5173,"
                "http://127.0.0.1:5173"
            )

        # ------------------------------------------------------
        # Already a Python list
        # ------------------------------------------------------

        if isinstance(
            value,
            list,
        ):
            values = value

        # ------------------------------------------------------
        # Environment-variable string
        # ------------------------------------------------------

        elif isinstance(
            value,
            str,
        ):
            raw = value.strip()

            if not raw:
                return (
                    "http://localhost:3000,"
                    "http://127.0.0.1:3000,"
                    "http://localhost:5173,"
                    "http://127.0.0.1:5173"
                )

            # Support JSON-array syntax:
            #
            # ["http://localhost:3000",
            #  "https://example.vercel.app"]
            #

            if raw.startswith("["):
                try:
                    parsed = json.loads(
                        raw
                    )

                    if isinstance(
                        parsed,
                        list,
                    ):
                        values = parsed
                    else:
                        values = [
                            raw
                        ]

                except json.JSONDecodeError:
                    values = raw.split(",")
            else:
                values = raw.split(",")

        else:
            values = [value]

        # ------------------------------------------------------
        # Clean + deduplicate origins
        # ------------------------------------------------------

        cleaned: list[str] = []

        for origin in values:

            if origin is None:
                continue

            normalized = (
                str(origin)
                .strip()
                .rstrip("/")
            )

            if not normalized:
                continue

            cleaned.append(
                normalized
            )

        return ",".join(
            dict.fromkeys(
                cleaned
            )
        )

    # ==========================================================
    # CORS LIST
    # ==========================================================

    @property
    def cors_origin_list(
        self,
    ) -> list[str]:

        if not self.cors_origins:
            return []

        origins: list[str] = []

        for origin in (
            self.cors_origins.split(",")
        ):

            normalized = (
                origin
                .strip()
                .rstrip("/")
            )

            if normalized:
                origins.append(
                    normalized
                )

        return list(
            dict.fromkeys(
                origins
            )
        )

    # ==========================================================
    # GEMINI API KEYS
    # ==========================================================

    @property
    def gemini_api_keys(
        self,
    ) -> list[str]:

        keys = [
            self.gemini_api_key_1,
            self.gemini_api_key_2,
            self.gemini_api_key_3,
        ]

        return [
            key.strip()
            for key in keys
            if key
            and key.strip()
        ]

    # ==========================================================
    # GROQ
    # ==========================================================

    @property
    def groq_is_available(
        self,
    ) -> bool:

        return bool(
            self.groq_api_key
            and self.groq_api_key.strip()
        )

    # ==========================================================
    # AI PROVIDER NAMES
    # ==========================================================

    @property
    def normalized_ai_primary_provider(
        self,
    ) -> str:

        return (
            self.ai_primary_provider
            .strip()
            .lower()
        )

    @property
    def normalized_ai_fallback_provider(
        self,
    ) -> str:

        return (
            self.ai_fallback_provider
            .strip()
            .lower()
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()
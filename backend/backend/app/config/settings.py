import os
from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_BACKEND_ROOT = Path(__file__).resolve().parents[2]
_ENV_FILE = _BACKEND_ROOT / ".env"

LOCAL_DEV_DEFAULT_JWT_SECRET = "dev-local-only-secret-do-not-use-in-production"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=str(_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = "mongodb://localhost:27017"
    database_name: str = "interview_platform"

    gemini_api_key_1: str = ""
    gemini_api_key_2: str = ""
    gemini_api_key_3: str = ""
    gemini_model: str = "gemini-3.6-flash"

    jwt_secret: str = LOCAL_DEV_DEFAULT_JWT_SECRET
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = 1440

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"
    max_upload_bytes: int = 5 * 1024 * 1024
    allowed_extensions: tuple[str, ...] = (".pdf", ".docx", ".txt", ".rtf", ".md")

    @field_validator("jwt_secret")
    @classmethod
    def validate_jwt_secret(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("JWT_SECRET must not be empty. Set it in the environment for each deployment.")

        is_production = os.getenv("APP_ENV", "").lower() == "production" or os.getenv("ENVIRONMENT", "").lower() == "production"
        insecure_defaults = {
            "change-me-in-production",
            "change-me-in-production-use-long-random-string",
            "dev-secret",
            LOCAL_DEV_DEFAULT_JWT_SECRET,
        }

        if is_production and normalized in insecure_defaults:
            raise ValueError("Production JWT_SECRET must be set to a unique environment-managed value.")

        return normalized

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def gemini_api_keys(self) -> list[str]:
        return [k for k in [self.gemini_api_key_1, self.gemini_api_key_2, self.gemini_api_key_3] if k]


@lru_cache
def get_settings() -> Settings:
    return Settings()

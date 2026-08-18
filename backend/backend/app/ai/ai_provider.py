from typing import Any

from fastapi import HTTPException

from app.ai.gemini_orchestrator import (
    get_gemini_orchestrator,
)
from app.ai.groq_orchestrator import (
    get_groq_orchestrator,
)
from app.config.settings import get_settings


class AIProvider:
    """
    Provider facade for all LLM operations.

    Application services communicate only with this facade.

    Default routing:

        Groq
          ↓
        Gemini fallback
    """

    def __init__(self) -> None:
        self.settings = get_settings()

        self._providers = {
            "groq": get_groq_orchestrator(),
            "gemini": get_gemini_orchestrator(),
        }

    @property
    def is_available(self) -> bool:
        return any(
            provider.is_available
            for provider in self._providers.values()
        )

    @property
    def primary_provider(self) -> str:
        return (
            self.settings
            .normalized_ai_primary_provider
        )

    @property
    def fallback_provider(self) -> str:
        return (
            self.settings
            .normalized_ai_fallback_provider
        )

    def _get_provider(
        self,
        name: str,
    ):
        provider = self._providers.get(name)

        if provider is None:
            raise HTTPException(
                status_code=500,
                detail=(
                    f"Unsupported AI provider "
                    f"'{name}'. "
                    "Supported providers are "
                    "'groq' and 'gemini'."
                ),
            )

        return provider

    def _provider_order(self) -> list[str]:
        primary = self.primary_provider
        fallback = self.fallback_provider

        order: list[str] = []

        if primary:
            order.append(primary)

        if (
            fallback
            and fallback != primary
        ):
            order.append(fallback)

        return order

    async def generate_json(
        self,
        task_prompt: str,
        context: dict[str, Any] | None = None,
        task_type: str | None = None,
    ) -> tuple[dict | list, int]:
        """
        Generate structured JSON through the configured
        provider order.

        task_type is optional so existing generation calls
        remain backward compatible.

        Examples:

            task_type="answer_evaluation"

        The method returns:

            (
                parsed_json,
                number_of_requests
            )
        """

        providers_tried = 0
        last_error: Exception | None = None

        for provider_name in self._provider_order():
            provider = self._get_provider(
                provider_name
            )

            if not provider.is_available:
                continue

            providers_tried += 1

            try:
                return await provider.generate_json(
                    task_prompt,
                    context,
                    task_type=task_type,
                )

            except HTTPException as exc:
                last_error = exc

                # Try the fallback provider when the
                # primary provider fails.
                continue

            except Exception as exc:
                last_error = exc

                # Try the fallback provider for unexpected
                # provider-side failures as well.
                continue

        if last_error is not None:
            if isinstance(
                last_error,
                HTTPException,
            ):
                raise last_error

            raise HTTPException(
                status_code=502,
                detail=(
                    f"AI provider error: "
                    f"{last_error}"
                ),
            ) from last_error

        if providers_tried == 0:
            raise HTTPException(
                status_code=503,
                detail=(
                    "No AI provider is configured "
                    "or available. Configure Groq "
                    "or Gemini API credentials."
                ),
            )

        raise HTTPException(
            status_code=503,
            detail=(
                "All configured AI providers are "
                "unavailable. Please retry shortly."
            ),
        )


_provider: AIProvider | None = None


def get_ai_provider() -> AIProvider:
    global _provider

    if _provider is None:
        _provider = AIProvider()

    return _provider


def reset_ai_provider() -> None:
    global _provider
    _provider = None
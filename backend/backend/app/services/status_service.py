from app.ai.ai_provider import get_ai_provider
from app.ai.gemini_orchestrator import get_gemini_orchestrator
from app.ai.groq_orchestrator import get_groq_orchestrator
from app.database import ping_db
from app.schemas.common import SystemStatusResponse
from app.services.aptitude_service import AptitudeService


class StatusService:
    async def get_status(
        self,
    ) -> SystemStatusResponse:

        mongo_ok = await ping_db()

        ai = get_ai_provider()
        gemini = get_gemini_orchestrator()
        groq = get_groq_orchestrator()

        aptitude = AptitudeService()

        resume_cache = mongo_ok
        skill_cache = mongo_ok

        apt_count = 0

        if mongo_ok:
            try:
                apt_count = await aptitude.count()
            except Exception:
                apt_count = 0

        return SystemStatusResponse(
            mongodb_connected=mongo_ok,

            # Existing field retained for compatibility.
            gemini_available=gemini.is_available,

            # New provider status.
            groq_available=groq.is_available,
            ai_available=ai.is_available,
            ai_primary_provider=ai.primary_provider,
            ai_fallback_provider=ai.fallback_provider,

            resume_cache_active=resume_cache,
            skill_cache_active=skill_cache,
            aptitude_bank_count=apt_count,
        )
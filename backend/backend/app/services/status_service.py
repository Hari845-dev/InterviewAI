from app.database import ping_db
from app.schemas.common import SystemStatusResponse
from app.services.aptitude_service import AptitudeService


class StatusService:
    async def get_status(self) -> SystemStatusResponse:
        from app.ai.gemini_orchestrator import get_gemini_orchestrator

        mongo_ok = await ping_db()
        gemini = get_gemini_orchestrator()
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
            gemini_available=gemini.is_available,
            resume_cache_active=resume_cache,
            skill_cache_active=skill_cache,
            aptitude_bank_count=apt_count,
        )

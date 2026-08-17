from app.database import get_db
from app.utils.text import normalize_skill_raw


class SkillNormalizationService:
    _cache: dict[str, str] = {}

    async def load_aliases(self) -> None:
        db = get_db()
        cursor = db.skill_aliases.find({})
        self._cache = {}
        async for doc in cursor:
            self._cache[doc["raw"]] = doc["canonical"]

    async def normalize(self, skill: str) -> str:
        if not self._cache:
            await self.load_aliases()
        raw = normalize_skill_raw(skill)
        return self._cache.get(raw, raw)

    async def normalize_list(self, skills: list[str]) -> list[str]:
        seen: set[str] = set()
        result: list[str] = []
        for skill in skills:
            canonical = await self.normalize(skill)
            if canonical and canonical not in seen:
                seen.add(canonical)
                result.append(canonical)
        return result


_skill_service: SkillNormalizationService | None = None


def get_skill_normalization_service() -> SkillNormalizationService:
    global _skill_service
    if _skill_service is None:
        _skill_service = SkillNormalizationService()
    return _skill_service

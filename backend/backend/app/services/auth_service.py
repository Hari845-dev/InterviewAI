from fastapi import HTTPException

from app.ai.gemini_orchestrator import get_gemini_orchestrator
from app.database import get_db
from app.schemas.auth import TokenResponse, UserLogin, UserRegister
from app.schemas.resume import StructuredProfile
from app.utils.auth import create_access_token, hash_password, verify_password
from app.utils.text import generate_id, utcnow


class AuthService:
    async def register(self, data: UserRegister) -> TokenResponse:
        db = get_db()
        existing = await db.users.find_one({"email": data.email.lower()})
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        user_id = generate_id()
        doc = {
            "_id": user_id,
            "email": data.email.lower(),
            "name": data.name,
            "password_hash": hash_password(data.password),
            "created_at": utcnow(),
        }
        await db.users.insert_one(doc)
        token = create_access_token(user_id, doc["email"], doc["name"])
        return TokenResponse(
            access_token=token,
            user_id=user_id,
            email=doc["email"],
            name=doc["name"],
        )

    async def login(self, data: UserLogin) -> TokenResponse:
        db = get_db()
        user = await db.users.find_one({"email": data.email.lower()})
        if not user or not verify_password(data.password, user["password_hash"]):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        token = create_access_token(user["_id"], user["email"], user["name"])
        return TokenResponse(
            access_token=token,
            user_id=user["_id"],
            email=user["email"],
            name=user["name"],
        )

from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.schemas.auth import TokenResponse, UserLogin, UserRegister, UserResponse
from app.services.auth_service import AuthService
from app.utils.auth import get_current_user_id

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=TokenResponse,
    summary="Register a new user",
    description="Create a new user account and return JWT tokens for authenticated access.",
)
async def register(data: UserRegister):
    return await AuthService().register(data)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Log in an existing user",
    description="Authenticate with email and password to receive a JWT access token.",
)
async def login(data: UserLogin):
    return await AuthService().login(data)


@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get current user profile",
    description="Fetch the authenticated user's profile details from the current JWT token.",
)
async def me(user_id: str = Depends(get_current_user_id)):
    db = get_db()
    user = await db.users.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserResponse(user_id=str(user["_id"]), email=user["email"], name=user["name"])

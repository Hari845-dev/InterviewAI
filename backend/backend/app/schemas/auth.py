from pydantic import BaseModel, EmailStr, Field, computed_field


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    name: str = Field(min_length=1)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: str
    email: str
    name: str

    @computed_field
    @property
    def full_name(self) -> str:
        return self.name

    @computed_field
    @property
    def user(self) -> dict:
        return {"id": self.user_id, "email": self.email, "full_name": self.name, "created_at": None}


class UserResponse(BaseModel):
    user_id: str
    email: str
    name: str

    @computed_field
    @property
    def full_name(self) -> str:
        return self.name

    @computed_field
    @property
    def user(self) -> dict:
        return {"id": self.user_id, "email": self.email, "full_name": self.name, "created_at": None}

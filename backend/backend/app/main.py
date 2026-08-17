from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import get_settings
from app.database import close_db, connect_db
from app.repositories.indexes import ensure_indexes
from app.routers import api, auth


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    try:
        await ensure_indexes()
    except Exception:
        pass
    yield
    await close_db()


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="AI Interview Intelligence Platform",
        description=(
            "Resume-grounded, job-aware interview preparation platform. "
            "Swagger UI exposes the authentication, resume, JD, aptitude, and session APIs."
        ),
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        openapi_tags=[
            {"name": "auth", "description": "Authentication and user identity APIs."},
            {"name": "api", "description": "Core interview, resume, JD, aptitude, and dashboard APIs."},
        ],
    )

    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
        if request.url.scheme == "https":
            response.headers.setdefault("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        return response

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(auth.router)
    app.include_router(api.router)
    return app


app = create_app()

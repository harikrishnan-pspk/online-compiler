import os
import logging
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.services.practice_service import seed_problems_if_empty
from app.api import auth, execute, ai, projects, files, history, practice, visualize

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("CodeForge")

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Seed sample problems if needed
try:
    with SessionLocal() as db:
        seed_problems_if_empty(db)
except Exception as e:
    logger.warning(f"Problem seeding notice: {e}")

app = FastAPI(
    title="CodeForge — AI Online Compiler & Coding Assistant",
    description="Production-grade online IDE, multi-language sandbox, and AI coding assistant backend.",
    version=settings.VERSION
)

# CORS configuration
allowed_origins = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    "https://harikrishnan-pspk.github.io",
]
extra_origins = os.getenv("ALLOWED_ORIGINS", "")
if extra_origins:
    allowed_origins.extend([o.strip() for o in extra_origins.split(",") if o.strip()])

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"https://.*(\.github\.io|\.vercel\.app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Friendly global exception handling (Requirement 24)
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Global unhandled error at {request.url.path}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Something went wrong while processing your request. Please try again.",
            "error_type": type(exc).__name__
        }
    )

# Register API Routers
app.include_router(auth.router)
app.include_router(execute.router)
app.include_router(ai.router)
app.include_router(projects.router)
app.include_router(files.router)
app.include_router(history.router)
app.include_router(practice.router)
app.include_router(visualize.router)

@app.get("/")
@app.get("/health")
@app.get("/api/health")
def health_check():
    from app.execution.compiler_registry import (
        get_jdk_toolchain,
        get_gcc_toolchain,
        get_node_binary,
        get_python_binary
    )
    gcc_path = get_gcc_toolchain(cpp=False)
    gpp_path = get_gcc_toolchain(cpp=True)
    javac_path, java_path = get_jdk_toolchain()
    node_path = get_node_binary()
    py_path = get_python_binary()

    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "sandbox": "active",
        "supported_languages": ["c", "cpp", "python", "java", "javascript"],
        "compilers": {
            "gcc": bool(gcc_path),
            "gpp": bool(gpp_path),
            "jdk": bool(javac_path and java_path),
            "node": bool(node_path),
            "python": bool(py_path)
        },
        "toolchain_paths": {
            "gcc": gcc_path,
            "gpp": gpp_path,
            "javac": javac_path,
            "java": java_path,
            "node": node_path,
            "python": py_path
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run("app.main:app", host=host, port=port, reload=True)

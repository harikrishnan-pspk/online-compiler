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
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
        "sandbox": "active",
        "supported_languages": ["c", "cpp", "python", "java", "javascript"]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)

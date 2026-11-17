import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.database import engine, Base
from app.config import UPLOAD_DIR
from app.routes import (
    auth_routes,
    subject_routes,
    material_routes,
    syllabus_routes,
    planner_routes,
    tutor_routes,
    quiz_routes,
    exam_routes,
    analytics_routes,
    revision_routes,
    focus_routes
)

# Initialize database schemas
Base.metadata.create_all(bind=engine)

# Auto-seed demo data if database is empty (e.g. on Vercel or fresh install)
try:
    from app.seed import seed_demo_data
    seed_demo_data()
except Exception as e:
    print(f"[StudyMind] Auto-seed status: {e}")

app = FastAPI(
    title="AI-Powered Smart Study Planner & Exam Preparation Platform",
    description="Multi-agent intelligent academic copilot for exam prep, dynamic planning, RAG tutoring, quizzes, mock testing, and focus mastery.",
    version="2.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include all API route modules
app.include_router(auth_routes.router)
app.include_router(subject_routes.router)
app.include_router(material_routes.router)
app.include_router(syllabus_routes.router)
app.include_router(planner_routes.router)
app.include_router(tutor_routes.router)
app.include_router(quiz_routes.router)
app.include_router(exam_routes.router)
app.include_router(analytics_routes.router)
app.include_router(revision_routes.router)
app.include_router(focus_routes.router)

@app.get("/health")
@app.get("/api")
@app.get("/api/")
@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "platform": "Smart Study Planner AI Platform",
        "version": "2.0.0",
        "agents": [
            "Agent 1: Syllabus Analyzer Agent",
            "Agent 2: Study Planning Agent",
            "Agent 3: AI Tutor Agent",
            "Agent 4: Quiz Generator Agent",
            "Agent 5: Exam Simulator Agent",
            "Agent 6: Performance Analysis Agent",
            "Agent 7: Revision Agent"
        ]
    }

# ---------------------------------------------------------------------------
# Frontend Static Asset & SPA Serving (Safety net for Vercel & self-hosting)
# ---------------------------------------------------------------------------
FRONTEND_DIST = None
_candidates = [
    Path(__file__).resolve().parent.parent.parent / "frontend" / "dist",
    Path(__file__).resolve().parent.parent / "frontend" / "dist",
    Path("frontend/dist"),
    Path("/var/task/frontend/dist"),
]
for _c in _candidates:
    if _c.exists() and (_c / "index.html").exists():
        FRONTEND_DIST = _c
        break

if FRONTEND_DIST:
    _assets_path = FRONTEND_DIST / "assets"
    if _assets_path.exists():
        app.mount("/assets", StaticFiles(directory=str(_assets_path)), name="frontend_assets")

    @app.get("/{full_path:path}")
    async def serve_spa_frontend(full_path: str):
        # Never intercept API requests
        if full_path.startswith("api/") or full_path == "api":
            raise HTTPException(status_code=404, detail="API route not found")
        target_file = FRONTEND_DIST / full_path
        if target_file.is_file():
            return FileResponse(str(target_file))
        return FileResponse(str(FRONTEND_DIST / "index.html"))
else:
    @app.get("/")
    def root_fallback():
        return {
            "message": "StudyMind AI Backend is running.",
            "status": "online",
            "docs": "/docs",
            "api_health": "/api/health"
        }

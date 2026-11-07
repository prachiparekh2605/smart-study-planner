"""
Vercel serverless entry-point for StudyMind AI.

Vercel's Python runtime expects an ASGI `app` object exported from this file.
The backend is in `../backend/` and is added to sys.path at import time.
"""
import sys
import os
from pathlib import Path

# ---------------------------------------------------------------------------
# Path resolution — works both locally and in Vercel's bundle layout
# ---------------------------------------------------------------------------
_this_dir = Path(__file__).resolve().parent          # smart-study-planner/api/
_root_dir = _this_dir.parent                          # smart-study-planner/
_backend_dir = _root_dir / "backend"                  # smart-study-planner/backend/

for _p in [str(_backend_dir), str(_root_dir)]:
    if _p not in sys.path:
        sys.path.insert(0, _p)

# ---------------------------------------------------------------------------
# Ensure writable directories exist in /tmp on Vercel
# ---------------------------------------------------------------------------
if os.getenv("VERCEL") or os.getenv("NOW_REGION"):
    for _d in ["/tmp/data", "/tmp/uploads"]:
        Path(_d).mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Import the FastAPI app — all routes, agents, and DB setup are inside main.py
# ---------------------------------------------------------------------------
from app.main import app  # noqa: E402  (import after sys.path mutation is intentional)

# Vercel Python runtime picks up the name `app` automatically.

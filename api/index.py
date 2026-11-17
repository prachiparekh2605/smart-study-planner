"""
Vercel serverless entry-point for StudyMind AI.

Vercel's Python runtime expects an ASGI `app` object exported from this file.
The backend is in `../backend/` and is added to sys.path at import time.
"""
import sys
import os
import urllib.parse
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
# Import the FastAPI app
# ---------------------------------------------------------------------------
from app.main import app as _base_app  # noqa: E402

# ---------------------------------------------------------------------------
# Vercel ASGI Path Normalizer Middleware
# ---------------------------------------------------------------------------
class VercelPathNormalizer:
    def __init__(self, inner_app):
        self.inner_app = inner_app

    async def __call__(self, scope, receive, send):
        if scope.get("type") == "http":
            query_str = scope.get("query_string", b"").decode("utf-8")
            params = urllib.parse.parse_qs(query_str)

            # 1. Path passed explicitly via rewrite query param ?__path=...
            if "__path" in params and params["__path"]:
                sub = params["__path"][0]
                if not sub.startswith("/"):
                    sub = "/" + sub
                scope["path"] = "/api" + sub if not sub.startswith("/api") else sub
            else:
                path = scope.get("path", "")
                headers = dict(scope.get("headers", []))
                matched_path = headers.get(b"x-matched-path", b"").decode("utf-8")

                if matched_path and matched_path.startswith("/api"):
                    scope["path"] = matched_path
                elif path.startswith("/api/index.py"):
                    sub = path[len("/api/index.py"):]
                    scope["path"] = "/api" + (sub if sub.startswith("/") else ("/" + sub if sub else ""))
                elif path.startswith("/api/index"):
                    sub = path[len("/api/index"):]
                    scope["path"] = "/api" + (sub if sub.startswith("/") else ("/" + sub if sub else ""))
                elif not path.startswith("/api") and path not in ["", "/", "/index.html"]:
                    scope["path"] = "/api" + (path if path.startswith("/") else ("/" + path))
                elif path in ["", "/"]:
                    scope["path"] = "/api/health"

        await self.inner_app(scope, receive, send)

app = VercelPathNormalizer(_base_app)

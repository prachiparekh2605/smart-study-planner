import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Detect Vercel serverless environment
IS_VERCEL = bool(os.getenv("VERCEL") or os.getenv("NOW_REGION"))

if IS_VERCEL:
    DATA_DIR = os.getenv("DATA_DIR", "/tmp/data")
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/tmp/uploads")
else:
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", str(BASE_DIR / "uploads"))
    DATA_DIR = os.getenv("DATA_DIR", str(BASE_DIR / "data"))

try:
    Path(UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(DATA_DIR).mkdir(parents=True, exist_ok=True)
except Exception as e:
    print(f"[Config] Directory creation warning: {e}")

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = f"sqlite:///{Path(DATA_DIR) / 'study_planner.db'}"

SECRET_KEY = os.getenv("SECRET_KEY", "super-secret-smart-study-planner-jwt-key-change-in-production-2026")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gemini-3.8-flash")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-001")

MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", "50"))
ALLOWED_EXTENSIONS = {
    ".pdf", ".pptx", ".ppt", ".docx", ".doc", ".txt", ".md",
    ".jpg", ".jpeg", ".png", ".webp"
}

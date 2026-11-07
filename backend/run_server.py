import uvicorn
import os
import sys

# Ensure backend root is on Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    print(f"Starting Smart Study Planner Backend Server on http://127.0.0.1:{port}...")
    uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=False)


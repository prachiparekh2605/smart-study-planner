# StudyMind AI — AI-Powered Smart Study Planner & Exam Preparation Platform

An enterprise-grade, modern, multi-agent AI academic copilot built for university students, competitive exam candidates, and lifelong learners.

---

## ⚡ Deploy to Vercel

StudyMind AI is fully pre-configured for **1-click or CLI deployment on Vercel** as a unified full-stack application (Vite React frontend + Python FastAPI serverless function).

### Option 1: Deploy via Vercel Dashboard (GitHub / Git)
1. Push this project to your GitHub, GitLab, or Bitbucket account:
   ```bash
   git init
   git add .
   git commit -m "Deploy StudyMind AI on Vercel"
   git branch -M main
   git remote add origin https://github.com/<your-username>/smart-study-planner.git
   git push -u origin main
   ```
2. Go to [vercel.com/new](https://vercel.com/new) and import the repository.
3. Vercel automatically detects `vercel.json`, `package.json`, and `api/index.py`.
4. (Optional) In **Environment Variables**, add:
   - `GEMINI_API_KEY`: *(Optional)* Your Google Gemini API Key.
   - `DATABASE_URL`: *(Optional)* If using external PostgreSQL (Neon, Supabase, Vercel Postgres). If not provided, it automatically provisions an isolated SQLite database in `/tmp`.
   - `SECRET_KEY`: *(Optional)* A secure random string for JWT encryption.
5. Click **Deploy**. Your app will be live on `https://your-project.vercel.app` in under 2 minutes!

### Option 2: Deploy via Vercel CLI
From the `smart-study-planner` root directory:
```bash
# Preview deployment
npx vercel

# Production deployment
npx vercel --prod
```

### How Vercel Configuration Works
- **`vercel.json`**: Defines the frontend build command (`cd frontend && npm install && npm run build`), points static assets to `frontend/dist`, and routes `/api/*` to the Python serverless function at `api/index.py`.
- **`api/index.py`**: ASGI serverless entrypoint exporting the FastAPI `app`.
- **`/tmp` storage fallback**: In Vercel's serverless environment, database files and uploads safely write to `/tmp` and auto-seed demo data on initial spin-up.

---

## 🌟 Architecture Overview

StudyMind AI is engineered around an **Orchestrated Multi-Agent Architecture** where 7 specialized AI agents collaborate across the student's study lifecycle:

```
[ Uploaded Study Files ]
         │ (PDF, PPTX, DOCX, TXT, Images, Handwritten notes)
         ▼
[ Document Processing Pipeline ] ──► [ Vector Store & Semantic Chunking ]
         │
         ├──► Agent 1: Syllabus Analyzer Agent (Curriculum Extraction & Redundancy Detection)
         │           │
         │           ▼
         ├──► Agent 2: Study Planning Agent (Workload Optimization & Auto-Rebalancing)
         │           │
         │           ▼
         ├──► Agent 3: AI Tutor Agent (Grounded RAG with Page/Slide Citations)
         │
         ├──► Agent 4: Quiz Generator Agent (MCQs, Fill-in-the-blank, Mistake Bank)
         │
         ├──► Agent 5: Exam Simulator Agent (Timed Conditions & AI Rubric Grading)
         │
         ├──► Agent 6: Performance Analysis Agent (Velocity Tracking & Topic Heatmaps)
         │
         └──► Agent 7: Revision Agent (SuperMemo SM-2 Flashcards & Formula Sheets)
```

---

## 🤖 The 7 AI Agents

| # | Agent Name | Primary Responsibility | Key Output / Algorithm |
|---|---|---|---|
| **1** | **Syllabus Analyzer** | Extracts curriculum units, topics, formulas, definitions, and detects redundancies and missing prerequisites. | Structured hierarchical syllabus DB with weightage diagnostics. |
| **2** | **Study Planner** | Calculates preparation workload, spaces study sessions, schedules checkpoint quizzes and mock exams, and reserves pre-exam buffer days. | Dynamic exam timetable with automated missed-session redistribution. |
| **3** | **AI Tutor** | Provides pedagogical explanations across 4 learning styles (Analogies, Step-by-Step Numerical, Academic Proofs, Cheat-Sheets). | Grounded RAG with source file and page/slide citations. |
| **4** | **Quiz Generator** | Generates topic, unit, and full-syllabus assessments across difficulty levels. | Auto-grading, pedagogical explanations, and Mistake Bank logging. |
| **5** | **Exam Simulator** | Generates full-length exam papers (Section A: Objective, Section B: Subjective) with countdown timer and question palette. | Rubric-based subjective AI grading (Accuracy, Steps, Terminology). |
| **6** | **Performance Analyzer**| Calculates syllabus completion %, study streaks, focus hours, accuracy heatmaps, and readiness grades. | Next Best Action recommendations and dynamic priority adjustments. |
| **7** | **Revision Agent** | Generates memory flashcards and compiles centralized formula reference sheets. | SuperMemo SM-2 spaced repetition interval calculation. |

---

## 🚀 Key Modules & Capabilities

### 1. Document Ingestion Pipeline
- **Multi-Format Support:** PDF, PPT/PPTX, DOC/DOCX, TXT, Markdown, JPG, JPEG, PNG, WEBP, and scanned notes.
- **Chunking with Citations:** Content is divided into overlapping semantic windows preserving exact page and slide numbers.
- **RAG Grounding:** The AI Tutor references the student's actual course notes rather than generic hallucinations.

### 2. Interactive Study Calendar
- **Views:** Day, Week, and Month scheduling views.
- **Color Coding:** Distinct palette per course subject.
- **Auto-Rebalance:** One-click dynamic rebalancer shifts overdue or missed sessions forward without compressing critical pre-exam buffer periods.

### 3. Focus Mode & Ambient Audio
- **Pomodoro Timers:** 25/5 Standard, 50/10 Deep Work, and custom intervals.
- **Web Audio Soundscapes:** Pure client-side synthetic audio generator (Gentle Rain, Forest Breeze, Cozy Cafe, Pink Noise) requiring zero external audio assets.
- **In-Focus Helper:** Ask quick questions to the AI without leaving the focus screen.

### 4. Enterprise-Grade Security & Isolation
- **Multi-Tenant Isolation:** Complete data separation by user ID and JWT authentication.
- **Zero-Halt Fallbacks:** Graceful fallback to deterministic academic heuristics and schedule optimization when no external API key is supplied.

---

## 🛠️ Local Development & Running

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd smart-study-planner/backend

# Install requirements
pip install -r requirements.txt

# Seed initial high-yield demo data (Alex Chen: student@example.com)
python -m app.seed

# Start backend server
python run_server.py
```
*Backend runs on `http://127.0.0.1:8000` (API documentation at `/docs`).*

### 2. Frontend Setup
```bash
cd smart-study-planner/frontend

# Install dependencies
npm install

# Start development server
npm run dev
```
*Frontend runs on `http://localhost:5173`.*

---

## 🔑 Demo Credentials
- **Email:** `student@example.com`
- **Password:** `password123`
*(Or use the 1-Click Demo Login button directly on the sign-in modal).*

---

## ⚙️ Google Gemini API Key Configuration
To connect with Google Gemini (`gemini-3.8-flash`):
1. Click **Settings & AI Key** in the sidebar.
2. Enter your `GEMINI_API_KEY` and click **Save Settings**.
3. Alternatively, export `GEMINI_API_KEY=your_key` in your environment or `.env` file.

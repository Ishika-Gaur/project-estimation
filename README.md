# CostifyAI 🚀
### Intelligent AI-Powered Software Cost Estimation & Project Scope Engine

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-blue?style=flat-square&logo=react)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Python](https://img.shields.io/badge/Python-3.10+-3776AB?style=flat-square&logo=python)](https://python.org)
[![MongoDB](https://img.shields.io/badge/MongoDB-Motor_Async-47A248?style=flat-square&logo=mongodb)](https://www.mongodb.com/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v4-06B6D4?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Gemini](https://img.shields.io/badge/Google_Gemini-3.7_Flash-4285F4?style=flat-square&logo=google)](https://ai.google.dev/)

---

## 📌 Overview

**CostifyAI** is an end-to-end full-stack platform designed to take the guesswork out of software planning and budgeting. By analyzing project descriptions, GitHub repositories, and live URLs with Google Gemini AI models, CostifyAI produces realistic cost projections, delivery timelines, tech stack recommendations, codebase completion audits, and team task distributions.

Whether you are a freelancer estimating client proposals, a founder scoping an MVP, or an agency assigning team sprints, CostifyAI turns ambiguous ideas into clear, budgeted roadmaps.

---

## ✨ Key Features

### 1. 💡 AI Cost & Timeline Estimator (`/estimate`)
- **Granular Scoping**: Tailor estimates by project type (*SaaS, Web App, Mobile, E-commerce, AI App*), target platforms, scale (*100 to 10,000+ users*), and buyer persona (*freelancer, agency, enterprise*).
- **Tiered Pricing**: Delivers **MVP**, **Budget**, **Typical**, and **Premium** cost estimates with transparent rationale.
- **Phase Breakdown**: Cost split across Frontend, Backend, Database Architecture, Third-party APIs, AI Integration, QA, and DevOps.
- **Tech Stack Recommendations**: Curated technology choices with layer-by-layer justification.
- **Complexity & Risk Scoring**: Scores overall complexity (*Low, Medium, High*) and suggests high-ROI additions.

### 2. 🔍 Codebase & URL Project Auditor (`/analyze`)
- **GitHub Repository Analysis**: Inspects file structure, README documentation, package manifests (`package.json`, `requirements.txt`), and commit activity via GitHub API.
- **Deployed App Scraping**: Analyzes live site metadata, response health, and visible frontend features.
- **Completion Tracking**: Calculates overall completion percentage and segments features into **Completed**, **In-Progress**, and **Remaining**.
- **Audit Evidence**: Provides concrete notes on implemented functionality and gaps.

### 3. 📋 Intelligent Task Distribution Planner (`/task-distribution`)
- **Actionable Roadmaps**: Converts project analysis into sequenced, dependency-mapped development tasks.
- **Solo & Team Modes**:
  - *Solo Mode*: Generates prioritized sprints ordered by dependency.
  - *Team Mode*: Balances hours and assigns tasks based on team members' roles and specific skill sets (*e.g., Frontend, Backend, DevOps, UI/UX*).

### 4. 📈 Dynamic Market Rate Engine (`/api/market-rates`)
- **Market Benchmarks**: Live developer rate tracking calibrated to global freelance and agency averages.
- **Automated Background Updates**: Weekly background task fetches and normalizes labor and technology rates.
- **Admin Control**: Admins can trigger manual rate refreshes and view snapshot histories.

### 5. 🔐 Authentication & Role-Based Access Control
- **Secure JWT Flow**: Short-lived Access Tokens paired with Refresh Tokens for seamless session persistence.
- **Password Security**: Bcrypt-hashed credentials via `passlib`.
- **Self-service Recovery**: Forgot password & tokenized password reset workflows.
- **Admin Dashboard (`/admin`)**: Metric overviews, user management, role elevation, and full estimation history explorer.

---

## 🏗️ Architecture

```
project-estimation/
├── backend/
│   ├── main.py                     # FastAPI application setup, CORS, MongoDB init & admin seeder
│   ├── auth.py                     # Authentication router, JWT handling & password utils
│   ├── estimate_router.py          # /api/estimate endpoint & legacy conversion logic
│   ├── estimation_logic.py         # Heuristic rule-based calculations & pricing fallbacks
│   ├── ai_service.py               # Google Gemini API client with fallback cascade
│   ├── project_analysis_router.py  # /api/project-analysis & task-plan routes
│   ├── project_analysis_service.py # GitHub scraper, web crawler & Gemini code analysis
│   ├── market_rate_router.py       # Market rates endpoints & admin refresh triggers
│   ├── market_rate_service.py      # Rate calculation logic & background scheduler
│   ├── models.py                   # Pydantic data schemas & request validations
│   └── requirements.txt            # Python dependencies
│
└── frontend/
    ├── app/
    │   ├── page.jsx                # Landing page with hero, process & testimonials
    │   ├── estimate/               # Multi-step project estimation form & interactive results
    │   ├── analyze/                # Repository & deployed URL audit interface
    │   ├── task-distribution/      # Task breakdown & team assignment view
    │   ├── admin/                  # Admin portal (metrics, user table, estimates log)
    │   ├── login/ & signup/        # User authentication screens
    │   ├── forgot-password/        # Password reset request flow
    │   └── reset-password/         # Password reset confirmation form
    ├── components/                 # Reusable UI components (Headers, Footers, Cards, Modals)
    ├── lib/                        # Auth helpers, API client, & mock data
    ├── package.json                # Next.js 15 & Tailwind 4 configuration
    └── postcss.config.mjs
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | [Next.js 15](https://nextjs.org/) (App Router), [React 19](https://react.dev/) |
| **Styling & UI** | [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/) Icons |
| **Backend Framework** | [FastAPI](https://fastapi.tiangolo.com/), [Uvicorn](https://www.uvicorn.org/) |
| **AI Integration** | [Google Gemini](https://ai.google.dev/) (`gemini-3.7-flash` with automatic fallback to `gemini-3.5-flash`, `gemini-3.8-flash`, etc.) |
| **Database** | [MongoDB](https://www.mongodb.com/) via [Motor](https://motor.readthedocs.io/) (Async Python Driver) |
| **Security & Utilities** | [SlowAPI](https://github.com/laurents/slowapi) (Rate Limiting), [python-jose](https://github.com/mpd50/python-jose) (JWT), [passlib](https://passlib.readthedocs.io/) (Bcrypt), [httpx](https://www.python-httpx.org/) |

---

## ⚡ Quick Start

### Prerequisites
- **Node.js**: `v18.18.0` or higher
- **Python**: `3.10` or higher
- **MongoDB**: Local instance running on port `27017` or a [MongoDB Atlas](https://www.mongodb.com/atlas) cluster URI
- **Google Gemini API Key**: Obtainable from [Google AI Studio](https://aistudio.google.com/)

---

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```

2. Create and activate a Python virtual environment:
   ```bash
   # On Windows (PowerShell):
   python -m venv venv
   .\venv\Scripts\activate

   # On macOS/Linux:
   python3 -m venv venv
   source venv/bin/activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Create your `.env` configuration:
   ```bash
   cp .env.example .env
   ```
   Configure the environment variables in `.env`:
   ```ini
   MONGO_URI=mongodb://localhost:27017
   SECRET_KEY=your-secure-random-secret-key-here
   GEMINI_API_KEY=your-google-ai-studio-gemini-api-key
   AI_MODEL=gemini-3.7-flash
   ADMIN_EMAILS=admin@CostifyAI.com
   ACCESS_TOKEN_EXPIRE_MINUTES=10080
   REFRESH_TOKEN_EXPIRE_DAYS=30
   ```

5. Launch the backend server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```
   The backend API will be live at `http://localhost:8000`.  
   Interactive Swagger docs are available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup

1. Open a new terminal and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```

2. Install Node dependencies:
   ```bash
   npm install
   ```

3. Ensure frontend environment variables are configured in `.env.local`:
   ```ini
   NEXT_PUBLIC_API_URL=http://localhost:8000
   ```

4. Launch the Next.js development server:
   ```bash
   npm run dev
   ```
   The application will be accessible at `http://localhost:3000`.

---

## 🔑 Default Credentials

On startup, the backend automatically seeds the system with a pre-configured administrator account:

- **Email**: `admin@CostifyAI.com`
- **Password**: `Admin@1234`
- **Role**: `admin`

*(Log in with these credentials to access the `/admin` portal and market rate controls.)*

---

## 📡 API Overview

| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/estimate` | Generate comprehensive AI project estimate | Optional |
| `POST` | `/api/project-analysis/analyze` | Audit GitHub repo or deployed URL | Optional |
| `POST` | `/api/project-analysis/task-plan`| Generate solo or team task plan | No |
| `GET`  | `/api/project-analysis/analyses` | Get user's past project audits | User |
| `GET`  | `/api/market-rates` | Fetch current market hourly & weekly rate bands | No |
| `POST` | `/api/market-rates/update` | Manually recalculate market rates | Admin |
| `POST` | `/api/auth/register` | Register new user account | No |
| `POST` | `/api/auth/login` | Authenticate and obtain JWT access token | No |
| `POST` | `/api/auth/refresh` | Refresh an expired access token | No |
| `GET`  | `/api/admin/metrics` | Retrieve global system stats & count metrics | Admin |
| `GET`  | `/api/admin/users` | List and manage registered users | Admin |
| `PUT`  | `/api/admin/users/{email}/role` | Update user permissions | Admin |

---

## 🛡️ Resilient AI Fallback Mechanism

To prevent outages caused by API rate-limiting or service deprecations, the backend implements a resilient multi-model fallback cascade:
1. **Primary**: `gemini-3.7-flash` (or configured `AI_MODEL`)
2. **Fallback 1**: `gemini-3.5-flash`
3. **Fallback 2**: `gemini-3.8-flash`
4. **Fallback 3**: `gemini-3.5-flash-lite`
5. **Fallback 4**: `gemini-3.6-flash`

If an API call hits a `429 (Rate Limit)` or `503`, the client immediately cascades to the next available model, guaranteeing high availability for end users.

---

## 🚀 Deployment

frontend - https://project-estimation-3ejl.onrender.com

backend - https://project-estimation-backend-fp5x.onrender.com


---



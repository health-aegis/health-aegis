# Aegis Health — AI-Powered Patient & Caregiver Advisor

## Overview
Medication non-adherence and communication gaps between patients and caregivers are significant challenges in modern healthcare. Aegis Health solves this by providing a unified platform where patients routinely track their:

- Daily medication schedules and adherence scores
- Upcoming appointments and clinic visits
- Physical activities and workouts
- Historical medical records and allergies

This project acts as an AI-powered health assistant — continuously monitoring patient adherence, generating context-aware insights, answering health-related questions using the Google Gemini AI, and automatically alerting assigned caregivers if a patient misses critical medication doses.

## Key Features

| Feature | Description |
|---|---|
| **AI Health Assistant** | A conversational agent powered by Google Gemini that analyzes real-time patient data to provide personalized adherence insights and answer schedule-related questions. |
| **Real-time Caregiver Alerts** | Background workers monitor patient activity and automatically emit Socket.IO alerts to caregivers when medication missed-dose thresholds are crossed. |
| **Medication Adherence Tracking** | Visual adherence scoring and daily checklists to ensure patients stay on top of their prescriptions. |
| **Complete Data Isolation** | Secure JWT-based authentication ensuring patients and caregivers only see their own private health data. |
| **Glassmorphic UI Dashboards** | A premium, modern frontend built with React, featuring dynamic modals for full CRUD operations on medical records, appointments, and activities. |
| **Rule-based AI Fallback** | Ensures continuous availability by falling back to a local, rule-based engine if the Gemini API is unreachable or rate-limited. |

## Architecture
The system is composed of five layers, each handling a distinct concern:

**1. Database Layer**
MongoDB stores all isolated user data including profiles, medical records, appointments, medications, activities, and caregiver alert statuses.

**2. API Gateway & Websockets**
An Express.js Node backend that serves RESTful APIs for all CRUD operations, orchestrates the AI logic, and handles real-time Socket.IO communication.

**3. Background Processing**
A dedicated Node.js worker service that polls the database on an interval to detect missed medications and trigger asynchronous caregiver notifications.

**4. AI Recommendation Engine**
Google Generative AI (Gemini Pro/Flash) integrated to ingest real-time MongoDB context and produce natural language health summaries and guidance.

**5. Dashboard Interface**
A responsive React SPA built with Vite and styled with custom Glassmorphism CSS, delivering separate dedicated views for Patients and Admins/Caregivers.

## Tech Stack

### Backend & Database
| Tool | Purpose |
|---|---|
| **Node.js & Express** | Core API Gateway and routing |
| **MongoDB & Mongoose** | Document database and object modeling |
| **Socket.IO** | Real-time bidirectional event-based communication |
| **JSON Web Tokens (JWT)** | Secure authentication and data isolation |

### AI & Processing
| Tool | Purpose |
|---|---|
| **Google Generative AI** | Core LLM for natural language processing and agentic reasoning |
| **Context Compiler** | Custom TypeScript logic to inject real-time patient states into prompts |

### Frontend
| Tool | Purpose |
|---|---|
| **React 18 & Vite** | Fast, modern Single Page Application framework |
| **Axios** | API request handling |
| **Vanilla CSS** | Premium glassmorphic styling and micro-animations |

### DevOps
| Tool | Purpose |
|---|---|
| **Docker** | Containerized application packaging for isolation |
| **Docker Compose** | Multi-container orchestration (API, Worker, Frontend, Nginx, DB) |
| **Nginx** | Reverse proxy and static file serving |

## Getting Started

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for containerized deployment)
- MongoDB (if running locally without Docker)
- Google Gemini API Key (optional — system will fallback to local engine if omitted)

### Local Setup (Without Docker)

```bash
# 1. Start MongoDB locally on port 27017
# (Ensure your local MongoDB service is running)

# 2. Setup the API Gateway
cd services/api-gateway
npm install
npm run dev

# 3. Setup the Notification Worker (in a new terminal)
cd services/notification-worker
npm install
npm run dev

# 4. Setup the Frontend Client (in a new terminal)
cd client
npm install
npm run dev
```

### Environment Variables
Create a `.env` file in `services/api-gateway/` and `services/notification-worker/`:

```env
# ─── MongoDB ────────────────────────────────────────────
MONGODB_URI=mongodb://localhost:27017/ai-health-agent

# ─── AI / Gemini ────────────────────────────────────────
GEMINI_API_KEY=your-gemini-api-key-here

# ─── JWT ────────────────────────────────────────────────
JWT_SECRET=your_super_secret_jwt_key_change_in_production

# ─── App ────────────────────────────────────────────────
PORT=5000
NODE_ENV=development
```

### Docker Deployment

```bash
# Build all images and start the orchestrated containers
docker compose up --build

# The application will be available at:
# Frontend: http://localhost:3000
# Backend API: http://localhost:5000
```

## Project Structure

```text
ai-devops/
├── services/
│   ├── api-gateway/               # Core Express API + Gemini AI engine + WebSockets
│   │   ├── src/
│   │   │   ├── routes/            # Express routers
│   │   │   ├── controllers/       # Request handlers
│   │   │   ├── middleware/        # JWT Auth and Error handling
│   │   │   ├── models/            # Mongoose schemas (Medications, Activities, etc.)
│   │   │   └── services/aiEngine/ # Gemini API integration & Prompting
│   │   └── Dockerfile
│   └── notification-worker/       # Background cron worker for missed meds
│       └── src/worker.ts          
├── client/                        # React SPA
│   ├── src/
│   │   ├── api/                   # Axios API definitions
│   │   ├── components/            # Reusable UI (Modals, ChatWindow, etc.)
│   │   ├── pages/                 # Patient & Caregiver Dashboards
│   │   └── App.jsx                # Routing and AuthContext
│   ├── nginx.conf                 # Nginx proxy configuration
│   └── Dockerfile
├── shared/                        # Shared TypeScript interfaces across microservices
├── docker-compose.yml             # Full stack deployment configuration
└── .env.example                   # Environment variable template
```

## How It Works

**1. Data Ingestion**
Patients use the React dashboard to log medications, schedule appointments, record workout activities, and update their medical history. All data is securely tied to their unique `userId`.

**2. Adherence Processing**
The background Notification Worker continuously sweeps the database to verify if scheduled medications were marked as taken. It increments missed-dose counters accordingly.

**3. AI Contextualization**
When a patient asks the AI Assistant a question, the API Gateway gathers their real-time history, adherence score, and caregiver status, compiling it into a strict context window before sending it to the Google Gemini model.

**4. Caregiver Notification**
If a patient's missed medication count exceeds their caregiver's custom alert threshold, a critical flag is thrown in the database, and a real-time WebSocket alert is broadcasted to the Caregiver Dashboard.

## Why This Project?
Aegis Health was built to demonstrate how AI can be securely and practically integrated into modern health tech. It goes beyond simple chatbot wrappers by utilizing real-world constraints:
- **Data Privacy:** Strict JWT isolation ensures AI never hallucinates other patients' data.
- **Resiliency:** Fallback chains guarantee the app remains functional even if external APIs fail.
- **Asynchronous Workloads:** Decoupling the notification worker from the main API prevents UI bottlenecking during intensive background calculations.
- **Actionable UX:** Moving beyond simple forms, the platform relies on dynamic, interactive UI patterns to keep patients engaged with their health.

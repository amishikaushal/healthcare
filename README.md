# RecoveryOS 🩺

**RecoveryOS** is an AI-powered healthcare management and patient recovery tracking platform. Designed for both patients and healthcare providers, it seamlessly bridges the gap between clinic visits by providing intelligent care plans, real-time recovery monitoring, and dynamic AI-generated insights.

---

## 🌟 Overview

RecoveryOS transforms post-care recovery by enabling doctors to track patient adherence and health trends, while giving patients an intuitive, gamified experience to manage their health journey.

### Key Features
- **Intelligent Dashboards**: Tailored interfaces for Patients and Doctors, providing a comprehensive view of recovery metrics and tasks.
- **Recovery Intelligence Engine**: Automatically calculates a dynamic **Recovery Score** (0-100) based on medication adherence, exercise logs, pain/mood trends, and appointment attendance.
- **AI Care Plan Builder**: Doctors can leverage Google's Gemini AI to instantly generate personalized, structured care plans by uploading medical reports and clinical notes.
- **AI Weekly Recovery Insights**: Every 7 days, the platform analyzes the patient's data (logs, scores, sleep, adherence) to generate detailed clinical summaries, highlighting achievements, positive trends, and potential clinical risks.
- **Real-time Tracking**: Patients can easily log daily symptoms, mood, energy levels, completed exercises, and medication intake.

---

## 💻 Tech Stack

### Frontend
- **React 18** (with **Vite**) for fast, modern UI development.
- **TypeScript** for robust, type-safe code.
- **Tailwind CSS** for responsive, utility-first styling with modern, premium aesthetics (glassmorphism, subtle micro-animations).
- **Zustand** for lightweight state management.
- **Recharts** for beautiful, data-rich charts and trend visualizations.
- **Lucide React** for crisp, scalable iconography.

### Backend
- **Node.js** & **Express** for a scalable, high-performance RESTful API.
- **TypeScript** for strict typings across controllers, services, and models.
- **PostgreSQL** (via `pg`) for robust relational data storage and JSONB document support.
- **Google Gemini API** (`@google/genai`) for powering intelligent AI care plan generation and weekly insight reporting.
- **Bcryptjs** for secure password hashing.

---

## 🚀 Getting Started

Follow these steps to set up RecoveryOS on your local machine for development.

### Prerequisites
- **Node.js** (v18 or higher recommended)
- **PostgreSQL** database
- **Google Gemini API Key** (for AI features)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/recoveryos.git
cd recoveryos
```

### 2. Backend Setup
Navigate to the `server` directory, install dependencies, and configure your environment:
```bash
cd server
npm install
```

Create a `.env` file in the `/server` directory:
```env
PORT=5001
DATABASE_URL=postgresql://user:password@localhost:5432/healthcare
GEMINI_API_KEY=your_gemini_api_key_here
JWT_SECRET=your_super_secret_jwt_key
```

Run the database migrations to set up your tables (assumes you have a script for this, e.g., executing the SQL in `/database/migrations/001_initial_schema.sql`).

Start the development server:
```bash
npm run dev
```
*The backend API will run on `http://localhost:5001`.*

### 3. Frontend Setup
Open a new terminal, navigate to the `client` directory, and install dependencies:
```bash
cd client
npm install
```

Start the Vite development server:
```bash
npm run dev
```
*The frontend application will be available at `http://localhost:3001`.*

---

## 🛠 Project Structure for Developers

The codebase is organized as a monorepo containing both the `client` and `server` environments.

```
recoveryos/
├── client/                # React Frontend
│   ├── src/
│   │   ├── components/    # Reusable UI elements (Modals, Buttons, Forms)
│   │   ├── contexts/      # React Contexts (if any)
│   │   ├── pages/         # Page components (Dashboard, PatientDetail, WeeklyReport)
│   │   ├── services/      # API client wrappers (axios/fetch)
│   │   └── store/         # Zustand state stores (authStore)
│   └── package.json
│
├── server/                # Express Backend
│   ├── src/
│   │   ├── controllers/   # Route handlers & business logic orchestration
│   │   ├── routes/        # Express routers definitions
│   │   ├── services/      # Heavy business logic, AI integrations (gemini.service.ts)
│   │   ├── database/      # DB connection pools and helpers
│   │   └── app.ts         # Express server entry point
│   └── package.json
│
└── database/              # DB Schema and Migrations
    └── migrations/
```

### Key Workflows to Understand
- **AI Integrations**: All Gemini AI prompts and integrations are housed in `server/src/services/gemini.service.ts`. This service is responsible for generating dynamic Care Plans and the Weekly AI Insights.
- **Recovery Engine**: The `recoveryScore.service.ts` calculates a patient's overall health score whenever an event occurs (e.g., logging a medication, finishing an exercise). This runs automatically as a background trigger attached to the respective controllers.

---


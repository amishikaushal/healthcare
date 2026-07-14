# RecoveryOS — Production Deployment Guide

> **Stack**: Neon (PostgreSQL) · Qdrant Cloud (vectors) · Render (Express API) · Vercel (React SPA)

---

## Phase 1 — Neon (PostgreSQL)

### 1.1 Provision the Database

1. Sign up / log in at [neon.tech](https://neon.tech)
2. **New Project** → name it `recoveryos`
3. Choose your region (pick one close to your Render region)
4. After creation, go to **Connection Details** → copy the **Connection string**
   ```
   postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```
   > This is your `DATABASE_URL`

### 1.2 Run Migrations

Connect using `psql` or the Neon SQL editor and run your migration file:

```bash
psql "postgresql://user:password@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require" \
  -f database/migrations/001_initial_schema.sql
```

> [!IMPORTANT]
> Migrations must be run **before** deploying the backend. The API will fail on startup if tables don't exist.

---

## Phase 2 — Qdrant Cloud (Vector DB)

### 2.1 Provision a Cluster

1. Sign up at [cloud.qdrant.io](https://cloud.qdrant.io) (free tier: 1 cluster, 1 GB)
2. **Create Cluster** → choose the same region as Render
3. After creation, from the cluster dashboard copy:
   - **Cluster URL** — e.g. `https://xyz.us-east4-0.gcp.cloud.qdrant.io`
   - **API Key** — create one under **API Keys**

These become `QDRANT_URL` and `QDRANT_API_KEY` on Render.

> [!NOTE]
> The `recoveryos_docs` collection will be created automatically by the app on first startup (`initCollection()` in `qdrant.service.ts`).

---

## Phase 3 — Render (Backend)

### 3.1 Deploy via Blueprint

1. Push the code to GitHub (make sure `render.yaml` is at the repo root)
2. In Render dashboard → **New** → **Blueprint**
3. Connect your GitHub repo → Render detects `render.yaml` automatically
4. Render will create the `recoveryos-api` web service

### 3.2 Set Environment Variables

In Render dashboard → `recoveryos-api` → **Environment** → fill in all `sync: false` vars:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Your Neon connection string |
| `JWT_ACCESS_SECRET` | `openssl rand -hex 64` |
| `JWT_REFRESH_SECRET` | `openssl rand -hex 64` |
| `JWT_EMAIL_SECRET` | `openssl rand -hex 64` |
| `JWT_RESET_SECRET` | `openssl rand -hex 64` |
| `CORS_ORIGINS` | Your Vercel URL (set after Phase 4, then redeploy) |
| `GEMINI_API_KEY` | Your Google AI Studio key |
| `QDRANT_URL` | Your Qdrant Cloud cluster URL |
| `QDRANT_API_KEY` | Your Qdrant Cloud API key |
| `SMTP_USER` | Your Gmail address |
| `SMTP_PASS` | Your Gmail app password |

### 3.3 Get Your Render URL

After the first deploy succeeds, copy your service URL:
```
https://recoveryos-api.onrender.com
```

### 3.4 Smoke Test the Backend

```bash
curl https://recoveryos-api.onrender.com/health
# Expected: {"status":"ok","timestamp":"...","version":"1.0.0"}
```

> [!WARNING]
> Render free tier **spins down** after 15 min of inactivity. First request after idle may take 30–60 seconds. Upgrade to a paid instance for production traffic.

---

## Phase 4 — Vercel (Frontend)

### 4.1 Deploy

1. Log in at [vercel.com](https://vercel.com)
2. **New Project** → Import your GitHub repo
3. Set **Root Directory** to `client`
4. Vercel auto-detects Vite — confirm these settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### 4.2 Set Environment Variables

In Vercel dashboard → Project → **Settings** → **Environment Variables**:

| Variable | Value | Environment |
|---|---|---|
| `VITE_API_URL` | `https://recoveryos-api.onrender.com` | Production |

> [!IMPORTANT]
> `VITE_API_URL` must have **no trailing slash** and must be the full `https://` URL.

### 4.3 Redeploy

After setting the env var, trigger a redeploy:
- Vercel dashboard → **Deployments** → **Redeploy** (or push a new commit)

### 4.4 Get Your Vercel URL

```
https://recoveryos.vercel.app   (or your custom domain)
```

---

## Phase 5 — Wire CORS

Now that you have both URLs, go back to **Render**:

1. `recoveryos-api` → **Environment**
2. Set `CORS_ORIGINS` = your Vercel URL (no trailing slash):
   ```
   https://recoveryos.vercel.app
   ```
3. Render auto-redeploys on env var change

---

## Phase 6 — End-to-End Smoke Tests

Run these after all services are live:

| Test | Expected |
|---|---|
| `GET https://recoveryos-api.onrender.com/health` | `{"status":"ok"}` |
| Open Vercel URL in browser | App loads, no console errors |
| Register a new account | 201 Created, redirects to dashboard |
| Log in | JWT tokens set in sessionStorage |
| Doctor: generate care plan | Gemini AI response returned |
| Patient: submit recovery log | Recovery score updates |
| Upload a document | OCR + vector embedding succeeds |

---

## Troubleshooting

### API calls fail from Vercel (CORS error)
- Check `CORS_ORIGINS` on Render matches your Vercel URL exactly (no trailing slash, correct `https://`)

### `503` on first Render request
- Normal on free tier (cold start). Wait 30–60 seconds.

### Database connection fails on Render
- Verify `DATABASE_URL` is set and includes `?sslmode=require`
- Neon free tier pauses after 5 days of inactivity — wake it from the Neon dashboard

### `GEMINI_API_KEY` errors
- Verify the key is active in [Google AI Studio](https://aistudio.google.com/app/apikey)
- Ensure the `gemini-2.5-flash` model is enabled for your key

### Qdrant vector search returns no results
- The `recoveryos_docs` collection is created on first server start — check Render logs for `✅ Qdrant collection "recoveryos_docs" created`
- Verify `QDRANT_URL` has no trailing slash

---

## Local Dev (unchanged)

```bash
# Start everything with Docker
docker compose up -d

# Frontend (Vite proxy handles /api → localhost:5001)
cd client && npm run dev

# Backend
cd server && npm run dev
```

No changes were made to the local development workflow.

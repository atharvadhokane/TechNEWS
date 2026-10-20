# AI Tech News Platform

An AI-curated tech news platform: articles are fetched on a schedule,
deduplicated, enriched by an LLM pipeline (summary, headline, category,
tags, embeddings, trending score), and served through a ranked feed,
daily digest, and search — matching the system architecture, deployment,
and activity diagrams this scaffold was generated from.

## Stack

| Layer            | Tech                                                |
|-------------------|------------------------------------------------------|
| Frontend          | Next.js (App Router) + Tailwind                      |
| Backend API       | Node.js + Express + Prisma                            |
| Queue / Worker    | BullMQ + Redis                                         |
| AI Service        | Python + FastAPI + Gemini / OpenAI / Grok (xAI) API    |
| Database          | PostgreSQL + pgvector                                  |
| Reverse Proxy     | NGINX                                                   |
| Orchestration     | Docker Compose                                          |

## Project layout

```
AI-Tech-News-Platform/
├── frontend/       Next.js app
├── backend/        Express API, BullMQ worker, Prisma schema
├── ai-service/      FastAPI AI enrichment service
├── database/        pgvector migration + DB notes
├── docker/           Per-service Dockerfiles
├── nginx/             Reverse proxy config
└── docker-compose.yml
```

## Pipeline

1. **FetchNews** — scheduler pulls from News APIs / RSS / Hacker News every 30 min
2. **StoreRaw** → **Deduplicate** — new articles are stored, near-duplicates grouped/dropped
3. **Queue AI Processing** — each article is pushed onto the BullMQ `ai-processing` queue
4. **LLMProcessing** (worker → AI service) — GenerateSummary → GenerateHeadline →
   Categorize → GenerateTags → GenerateEmbeddings
5. **ComputeTrendingScore** → **StoreEnrichedDatabase**
6. Fan-out: **GenerateDailyDigest** (once/day) and **RecommendationEngine**
   (ranks using preferences + pgvector embeddings)

## Local development (without Docker)

Requires Node 20+, Python 3.11+, PostgreSQL with the `pgvector` extension, and Redis.

```bash
# 1. Backend
cd backend
cp .env.example .env        # fill in DATABASE_URL, REDIS_URL, JWT_SECRET, AI_SERVICE_URL
npm install
npm run prisma:migrate
psql "$DATABASE_URL" -f ../database/migrations/001_enable_pgvector.sql
npm run seed
npm run dev                 # API on :4000

# 2. Worker (separate terminal)
cd backend
node src/jobs/aiProcessing.worker.js

# 3. AI service (separate terminal)
cd ai-service
cp .env.example .env        # AI_PROVIDER=gemini by default; fill in GEMINI_API_KEY (free, no billing)
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# 4. Frontend (separate terminal)
cd frontend
cp .env.local.example .env.local
npm install
npm run dev                 # app on :3000
```

## Local development (Docker Compose)

```bash
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
# edit both .env files with real secrets (GEMINI_API_KEY, JWT_SECRET, etc.)

docker compose up --build
```

This starts: `nginx` (port 80) → `frontend` + `backend` → `worker`, `ai-service`,
`postgres` (pgvector), `redis`. The pgvector extension + `embedding` column
migration in `database/migrations/` is auto-applied on first Postgres startup
via `docker-entrypoint-initdb.d`.

## AI provider & rate limiting

`ai-service/app/utils/ai_client.py` is provider-agnostic — set `AI_PROVIDER`
in `ai-service/.env` to `gemini` (default, genuine free tier), `openai`, or
`grok` (xAI — no free tier, billed per token from the first request, and
no embeddings endpoint of its own, so embeddings fall back to OpenAI).

**Gemini rate limiting** happens at two levels:

1. **Real throttle, in Python** (`ai-service/app/utils/ai_client.py`) — a
   sliding-window limiter paces every individual Gemini call (chat *and*
   embedding) to at most `GEMINI_RPM` requests/minute, and stops making
   calls once the approximate daily cap `GEMINI_RPD` is hit for the day.
   This is the layer that matters: each article makes up to 5 separate
   Gemini calls (summary, headline, category, tags, embedding), so
   pacing job *starts* alone isn't enough to keep the actual call rate
   under Gemini's free-tier RPM. If Gemini still returns a 429 (e.g. a
   TPM limit, which isn't tracked here), it retries with exponential
   backoff (`AI_MAX_RETRIES`, `AI_RETRY_BASE_DELAY_SECONDS`).
2. **Coarse backstop, in Node** (`backend/src/jobs/aiProcessing.worker.js`)
   — articles are enriched one at a time (`AI_JOB_CONCURRENCY=1`) with a
   capped number of job starts per minute (`AI_JOBS_PER_MINUTE`,
   configurable in `backend/.env`), so a pile of newly-fetched articles
   doesn't all hit the queue at once.

Defaults (`GEMINI_RPM=15`, `GEMINI_RPD=1000`, `AI_JOBS_PER_MINUTE=3`) are
conservative estimates for the Gemini Flash-Lite free tier — check
https://ai.google.dev/gemini-api/docs/rate-limits for current numbers and
adjust if you're seeing 429s or want more headroom.

## Notes / next steps

- `backend/src/services/newsFetch.service.js` — `fetchFromSources()` is a stub;
  wire up real News API / RSS / Hacker News calls there.
- `backend/src/prisma/schema.prisma` — the `embedding` column is added via raw
  SQL migration rather than Prisma, since Prisma has no native `vector` type yet;
  query it with `prisma.$queryRaw` (see `recommendation.service.js` for an example).
- Auth is JWT-based with bcrypt password hashing; no refresh tokens yet.
- `ai-service` recommendation/digest routers are lightweight placeholders —
  the ranking logic can live in the Node backend (via pgvector) or here,
  depending on where you want that computation to run.

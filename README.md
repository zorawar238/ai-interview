# AI Coding Interview Platform

An adaptive, interactive technical interview preparation platform built with Next.js, PostgreSQL (Supabase), and local AI model inference (Ollama).

---

## Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database & Auth**: PostgreSQL on Supabase with Row-Level Security (RLS) & `@supabase/ssr`
- **AI Inference**: Local Ollama via `@ai-sdk/openai` compatibility layer (₹0 cost, 100% private)
- **Validation**: Zod (Structured LLM output validation via `generateObject`)
- **Testing**: Vitest with native ESM and zero-fluff assertion suites

---

## Documentation Index

Comprehensive documentation is maintained in [`docs/`](./docs):

- **[docs/PROJECT_VISION.md](./docs/PROJECT_VISION.md)**: Product goals, principles, and target personas.
- **[docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md)**: System design and end-to-end data flow.
- **[docs/DATABASE_DESIGN.md](./docs/DATABASE_DESIGN.md)**: Entity Relationship Diagram (ERD), schema definitions, and RLS policies.
- **[docs/API_SPECIFICATION.md](./docs/API_SPECIFICATION.md)**: REST and SSE endpoint documentation with request/response schemas.
- **[docs/AI_ENGINEERING.md](./docs/AI_ENGINEERING.md)**: LLM integration, prompt design, structured output validation, and fallback resilience.
- **[docs/DECISION_LOG.md](./docs/DECISION_LOG.md)**: Architectural Decision Records (ADRs) with rationale and tradeoffs.
- **[docs/LEARNING_ROADMAP.md](./docs/LEARNING_ROADMAP.md)**: Core computer science and web engineering skills roadmap.
- **[docs/IMPLEMENTATION_LOG.md](./docs/IMPLEMENTATION_LOG.md)**: Changelog of implemented milestones.
- **[docs/TESTING_STRATEGY.md](./docs/TESTING_STRATEGY.md)**: Testing architecture, deterministic vs non-deterministic testing, and coverage.
- **[docs/SECURITY.md](./docs/SECURITY.md)**: Security boundaries, environment sanitization, and RLS audit.
- **[docs/KNOWN_LIMITATIONS.md](./docs/KNOWN_LIMITATIONS.md)**: Explicit assessment of sandbox boundaries, browser compatibility, and local LLM scale.
- **[docs/DEBUGGING_LOG.md](./docs/DEBUGGING_LOG.md)**: Verified engineering resolutions for real-world issues encountered.
- **[docs/INTERVIEW_PREPARATION.md](./docs/INTERVIEW_PREPARATION.md)**: Technical interview Q&A guide explaining the system's design and code.
- **[docs/GLOSSARY.md](./docs/GLOSSARY.md)**: Definitions of core domain and architectural terms.
- **[docs/RELEASE_NOTES.md](./docs/RELEASE_NOTES.md)**: Official v1.0.0 release notes and feature highlights.

---

## Getting Started

### 1. Environment Setup

Create `.env.local` with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
OLLAMA_BASE_URL=http://localhost:11434/v1
```

### 2. Database Migration

Run the SQL migration script in your Supabase SQL Editor:
- [`supabase/migrations/20261012000000_create_interview_tables.sql`](./supabase/migrations/20261012000000_create_interview_tables.sql)

### 3. Local Model Setup (Ollama)

Ensure [Ollama](https://ollama.com/) is running and pull the model:

```bash
ollama pull llama3.2
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to test the application.

### 5. Run Automated Tests

Execute the Vitest regression test suite:

```bash
npm test
```

### 6. Containerized Deployment (Docker)

To launch the complete stack (Next.js Application + Local Ollama service) in Docker:

```bash
docker compose up -d
```
Pull the model inside the Ollama container:
```bash
docker compose exec ollama ollama pull llama3.2
```
Access the application at [http://localhost:3000](http://localhost:3000).


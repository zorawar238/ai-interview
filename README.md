# AI Coding Interview Platform

An adaptive, interactive technical interview preparation platform built with Next.js, PostgreSQL (Supabase), and local AI model inference (Ollama).

---

## Architecture & Tech Stack

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4
- **Database & Auth**: PostgreSQL on Supabase with Row-Level Security (RLS) & `@supabase/ssr`
- **AI Inference**: Local Ollama via `@ai-sdk/openai` compatibility layer (₹0 cost, 100% private)
- **Validation**: Zod (Structured LLM output validation via `generateObject`)

---

## Documentation Index

Comprehensive documentation is maintained in [`docs/`](./docs):

- **[docs/PROJECT_VISION.md](./docs/PROJECT_VISION.md)**: Product goals, principles, and target personas.
- **[docs/SYSTEM_ARCHITECTURE.md](./docs/SYSTEM_ARCHITECTURE.md)**: System design and end-to-end data flow.
- **[docs/DATABASE_DESIGN.md](./docs/DATABASE_DESIGN.md)**: Entity Relationship Diagram (ERD), schema definitions, and RLS policies.
- **[docs/DECISION_LOG.md](./docs/DECISION_LOG.md)**: Architectural Decision Records (ADRs) with rationale and tradeoffs.
- **[docs/LEARNING_ROADMAP.md](./docs/LEARNING_ROADMAP.md)**: Core computer science and web engineering skills roadmap.
- **[docs/IMPLEMENTATION_LOG.md](./docs/IMPLEMENTATION_LOG.md)**: Changelog of implemented milestones.
- **[docs/INTERVIEW_PREPARATION.md](./docs/INTERVIEW_PREPARATION.md)**: Comprehensive technical interview Q&A guide explaining the system's architecture, database design, and AI integrations.

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

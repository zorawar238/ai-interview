# Decision Log

Record every significant engineering decision here.

---

**Decision ID:** 001
**Date:** 2026-10-09
**Status:** Accepted

**Problem:** What full-stack framework should we use for the application?
**Context:** We need a beginner-understandable architecture that supports both a dynamic frontend and secure backend API routes.
**Options considered:** Next.js, Vite + Express, Create React App + Node.js.
**Decision:** **Next.js (App Router)**.
**Reasoning:** It allows building a modular monolith where frontend and backend live in the same repository, reducing operational complexity. It provides excellent TypeScript support and built-in API routes.
**Tradeoffs:** Next.js App Router has a learning curve regarding Server vs. Client components.
**Alternatives rejected:** Vite + Express requires managing two separate projects and configuring CORS, which adds unnecessary initial complexity.

---

**Decision ID:** 002
**Date:** 2026-10-09
**Status:** Accepted

**Problem:** How do we handle database and authentication?
**Context:** We want a cost-effective (ideally free), scalable, and standard SQL relational database.
**Options considered:** Supabase, Firebase, MongoDB, raw PostgreSQL on AWS/Heroku.
**Decision:** **Supabase**.
**Reasoning:** Provides a generous free tier, out-of-the-box secure Auth, and standard PostgreSQL. It allows us to learn relational databases (SQL, Foreign Keys) which is highly valuable for interviews.
**Tradeoffs:** Vendor lock-in to Supabase's specific Auth API (though PostgreSQL itself is portable).
**Alternatives rejected:** MongoDB (NoSQL is less suited for our highly relational data like Users -> Interviews -> Questions -> Answers). Firebase (NoSQL).

---

**Decision ID:** 003
**Date:** 2026-10-09
**Status:** Accepted

**Problem:** Which AI Provider should we use?
**Context:** We need a cost-effective way to generate questions and evaluate answers securely. The user explicitly requested a local, free option.
**Options considered:** OpenAI API, Anthropic API, Local Ollama.
**Decision:** **Local Ollama**.
**Reasoning:** Runs entirely locally, ensuring 100% privacy and exactly ₹0 cost regardless of usage volume. Eliminates the risk of exceeding API quotas during development.
**Tradeoffs:** Requires the host machine to have sufficient RAM and compute to run models locally. Responses might be slower than commercial APIs depending on hardware. We must ensure the local model supports structured JSON output reliably.
**Alternatives rejected:** OpenAI/Anthropic (rejected to avoid potential costs and API limits during heavy development/testing).

---

**Decision ID:** 004
**Date:** 2026-10-12
**Status:** Accepted

**Problem:** How do we interface local Ollama models with Vercel AI SDK v7 without type mismatches or unmaintained community package issues?
**Context:** The project uses `ai` v7 (`^7.0.137`), which requires `LanguageModelV2` through `V4`. The community package `ollama-ai-provider` only implements `LanguageModelV1`, causing TypeScript compilation errors. Another package `ollama-ai-provider-v2` had peer dependency conflicts with Zod 3.x.
**Options considered:** 
1. Downgrading `ai` to v3/v4.
2. Using community `ollama-ai-provider-v2` with forced peer dependencies.
3. Using official `@ai-sdk/openai` configured with Ollama's native `/v1` endpoint (`http://localhost:11434/v1`).
**Chosen decision:** **`@ai-sdk/openai` targeting Ollama's OpenAI-compatible endpoint**.
**Reasoning and evidence:** Ollama natively supports the OpenAI Chat Completions API format at `http://localhost:11434/v1`. `@ai-sdk/openai` is an official, first-party Vercel AI SDK package that guarantees strict type compatibility with `ai` v7 (implementing `LanguageModelV4`), supports structured output schemas via `generateObject`, requires no payment/cloud key, and resolves cleanly with standard Zod 3.x.
**Tradeoffs:** Model calls use `ollama.chat('llama3.2')` rather than a dedicated Ollama SDK syntax.
**Rejected alternatives and why:** Downgrading `ai` loses modern streaming and schema generation primitives. `ollama-ai-provider` is abandoned and incompatible with `LanguageModelV4`.
**Consequences:** Complete type safety, zero npm resolution conflicts, and straightforward configuration via `process.env.OLLAMA_BASE_URL`.
**Conditions that would justify revisiting:** If an official `@ai-sdk/ollama` provider is published by Vercel with features not supported over the `/v1` compatibility layer.
**Related files and tests:** `src/utils/ai/ollama.ts`, `src/app/api/generate-question/route.ts`, `src/app/api/chat/route.ts`.

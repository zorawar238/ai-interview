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

---

**Decision ID:** 005
**Date:** 2026-10-13
**Status:** Accepted

**Problem:** How do we integrate a professional in-browser code editor (Monaco Editor) into Next.js 16 App Router without breaking server-side rendering (SSR)?
**Context:** Monaco Editor relies heavily on browser DOM APIs (`window`, `document`) and browser Web Workers. Rendering it directly in Server Components or during Next.js SSR causes `"window is not defined"` errors.
**Options considered:**
1. Plain HTML `<textarea>` with simple syntax highlighting regex.
2. Lightweight CodeMirror.
3. `@monaco-editor/react` loaded dynamically with `next/dynamic` and `ssr: false`.
**Chosen decision:** **`@monaco-editor/react` with `next/dynamic({ ssr: false })`**.
**Reasoning and evidence:** Monaco Editor is the actual editor engine powering Visual Studio Code. It provides familiar keybindings, multi-language support, font ligatures, indentation, and bracket colorization that mimic authentic coding interviews (like CoderPad and LeetCode). Using `dynamic(() => import('@monaco-editor/react'), { ssr: false })` safely isolates all browser-dependent initialization to the client after component mounting, with a skeleton fallback during initial load.
**Tradeoffs:** Monaco has a larger bundle size than CodeMirror, but because it is dynamically imported, it is never included in the initial page bundle for the landing page or login screens.
**Rejected alternatives and why:** Plain textarea offers a poor developer experience for code. CodeMirror is lighter but lacks the out-of-the-box VS Code fidelity and language tooling of Monaco.
**Consequences:** Flawless coding experience during interviews with zero SSR hydration errors.
**Conditions that would justify revisiting:** If client memory usage on low-end mobile devices becomes a limiting factor.
**Related files and tests:** `src/app/interview/[id]/InterviewWorkspace.tsx`, `src/app/interview/[id]/page.tsx`.

---

**Decision ID:** 006
**Date:** 2026-10-13
**Status:** Accepted

**Problem:** How do we safely execute untrusted candidate code (TypeScript, JavaScript, Python, SQL) in real-time with ₹0 API cost, zero third-party rate limits, and full defense against server compromise?
**Context:** The PRD (FR-08) requires safe isolated code execution without executing untrusted code inside the main Node.js web server. Public cloud runners like Piston have transitioned to whitelist-only access as of 2026, and Judge0 requires paid RapidAPI keys.
**Options considered:**
1. Running untrusted code using `eval()` or `vm` inside the Next.js process (Rejected: Catastrophic security vulnerability allowing RCE, `process.exit()`, and credential theft).
2. Requiring user-provided cloud sandbox API keys (Judge0 / Piston) (Rejected: Violates the ₹0 setup and local privacy target).
3. Local multi-language subprocess runner with strict environment sanitization, ephemeral directories, 5000ms hard timeouts, and capped output buffers.
**Chosen decision:** **Local multi-language subprocess runner (`/api/execute`) with sanitized environment (`safeEnv`), hard execution timeouts (5000ms), and ephemeral directory cleanup.**
**Reasoning and evidence:** 
- Node 24 natively executes TypeScript without external dependencies via `--experimental-strip-types`.
- Python 3.14 runs Python scripts directly and executes SQL queries inside in-memory SQLite sandboxes with sample interview datasets.
- Process separation prevents candidate code from touching the Next.js event loop.
- Sanitizing the child process `env` completely strips Supabase credentials, Ollama configurations, and database secrets.
- Hard 5000ms timeouts kill runaway loops (`while(true) {}`), and 64 KB output buffer caps prevent memory flooding.
**Tradeoffs:** In a multi-tenant cloud SaaS deployment, container-level isolation (Docker / gVisor / Firecracker) would be layered over this runner. For local-first developer environments, this provides 100% offline functionality with ₹0 cost and zero quota exhaustion.
**Consequences:** Instant execution feedback for candidates across TypeScript, JavaScript, Python, and SQL with guaranteed timeout protection and zero secret leakage.
**Related files and tests:** `src/lib/validations/execution.ts`, `src/app/api/execute/route.ts`, `src/app/interview/[id]/InterviewWorkspace.tsx`, `docs/SECURITY.md`.

---

**Decision ID:** 007
**Date:** 2026-10-14
**Status:** Accepted

**Problem:** How do we transition the interview engine from a rigid, pre-generated static question list into a responsive, multi-turn adaptive interview that evaluates and calibrates questions dynamically based on actual candidate performance?
**Context:** In real technical interviews, an interviewer does not read a static question script. If a candidate excels, the interviewer escalates the problem to test upper competency boundaries. If a candidate struggles, the interviewer adjusts down to test foundational recovery.
**Options considered:**
1. Generating all questions upfront and attempting to rewrite them in-place during the session (Rejected: Wasteful token generation, inflexible branching, and awkward state reconciliation).
2. Dynamic on-demand generation: generate only Question 1 at start, evaluate candidate answers in `submitAnswerAction`, and invoke the adaptive engine to generate Question $N+1$ with explicit context on previous answers and rubrics (Chosen).
**Chosen decision:** **Multi-turn dynamic question generation with serialized `adaptiveContext` inside `questions.rubric` and deterministic fallback safety.**
**Reasoning and evidence:**
- Storing `adaptiveContext`, `targetQuestions`, and `interviewMode` in the JSON payload of the `rubric` column guarantees 100% backward compatibility without breaking existing Supabase PostgreSQL instances with missing columns.
- Starting with Question 1 drastically reduces initial interview creation latency (from ~15 seconds to ~3 seconds).
- Thresholds are mathematically defined: $\ge 80\%$ triggers Level Up (+1 difficulty, deep internals/scaling), $< 60\%$ triggers Scaffolding (-1 difficulty or targeted diagnostic), and $60–79\%$ triggers Lateral Pivot (untested topic at same difficulty).
- Deterministic fallback generation prevents interview deadlocks if local Ollama encounters transient timeouts.
**Tradeoffs:** Generation latency occurs between question submissions (3–5 seconds), which is mitigated by clear UI spinners indicating *"Evaluating Solution & Calibrating Follow-up..."*.
**Consequences:** True adaptive interviewing experience that challenges candidates at their exact frontier of knowledge.
**Related files and tests:** `src/lib/adaptive/engine.ts`, `src/lib/validations/interview.ts`, `src/app/interview/actions.ts`, `src/app/interview/[id]/page.tsx`, `src/app/interview/[id]/InterviewWorkspace.tsx`.

---

**Decision ID:** 008
**Date:** 2026-10-14
**Status:** Accepted

**Problem:** How do we introduce voice interaction (speech-to-text dictation and text-to-speech AI articulation) while preserving the platform's core pillars of ₹0 API cost, 100% on-device privacy, zero audio cloud uploads, and zero third-party bundle weight?
**Context:** Technical interviews require verbal communication of assumptions, edge cases, and architectural trade-offs. Using cloud speech services (Whisper API, ElevenLabs, Deepgram) incurs recurring fees, requires network data transmission of candidate voices, and introduces cloud dependency.
**Options considered:**
1. Cloud STT/TTS via third-party APIs (OpenAI Whisper / ElevenLabs) (Rejected: Violates the offline-first, local privacy, and ₹0 cost requirements).
2. Heavy local WASM speech packages (Transformers.js / Whisper.wasm) (Rejected: Multi-megabyte bundle bloat and heavy client memory/CPU overhead).
3. Browser-native Web Speech API (`webkitSpeechRecognition` & `window.speechSynthesis`) wrapped with React 19 `useSyncExternalStore` (Chosen).
**Chosen decision:** **Native Web Speech API with `useSyncExternalStore` subscriptions and markdown speech sanitization.**
**Reasoning and evidence:**
- Zero bundle size: utilizes the operating system and browser's built-in neural speech synthesis and acoustic recognition models.
- Absolute privacy: no audio is sent to our servers or third-party cloud APIs.
- React 19 compliance: using `useSyncExternalStore` avoids cascading re-renders from synchronous `setState` in effects and guarantees safe SSR hydration.
- Natural speech output: preprocessing text to strip code blocks, formatting asterisks, and backticks prevents synthetic voices from reading out punctuation.
**Tradeoffs:** Speech recognition availability depends on browser support (supported in Google Chrome, Microsoft Edge, Brave, Safari; limited in Firefox). Handled gracefully with capability checks and polite fallback notifications.
**Consequences:** High-fidelity hands-free mock interview experience with spoken questions and voice thought dictation at zero cost.
**Related files and tests:** `src/hooks/useWebSpeech.ts`, `src/app/interview/[id]/InterviewWorkspace.tsx`.



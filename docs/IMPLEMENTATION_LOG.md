# Implementation Log

This document records the completed tasks, files changed, and what was implemented.

---

## Milestone 1: Foundation
**Date:** 2026-10-09

**Task Objective:** 
Set up the application shell, Next.js framework, environment configuration, health endpoint, and initial documentation.

**Files Created:**
- `package.json`, `tsconfig.json`, `tailwind.config.ts`, `next.config.ts` (Next.js initialization)
- `src/app/page.tsx` (Default Next.js page)
- `src/app/api/health/route.ts` (Health check endpoint)
- `docs/PROJECT_VISION.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DECISION_LOG.md`
- `docs/LEARNING_ROADMAP.md`
- `docs/IMPLEMENTATION_LOG.md`

**What was implemented:**
1. A fresh Next.js App Router project using TypeScript and Tailwind CSS.
2. The structural `docs/` folder containing the planning and architectural documents as specified by the PRD.
3. A basic `/api/health` REST endpoint to verify the backend routes are functioning.

**How it works:**
- The Next.js framework automatically sets up a web server.
- The `src/app/` directory uses file-system based routing.
- Navigating to `/api/health` triggers the `GET` function inside `src/app/api/health/route.ts`, which returns a JSON payload confirming the server is alive.

**Dependencies introduced:**
- `next`, `react`, `react-dom` (Core Framework)
- `tailwindcss`, `eslint`, `typescript` (Styling and Tooling)

**Known Limitations:**
- No database connection yet.
- No AI provider connection yet.
- The UI is currently just the default Next.js starter page.

**Next Steps:**
Proceed to Milestone 2: Auth and data (setting up Supabase).

---

## Milestone 2: Authentication & Database Schema
**Date:** 2026-10-12

**Task Objective:**
Configure Supabase Authentication (SSR client, server utilities, middleware, sign-in/up routes, protected dashboard) and define the relational PostgreSQL database schema with indexes and Row-Level Security (RLS).

**Files Created / Modified:**
- `src/utils/supabase/client.ts` (Browser Supabase client)
- `src/utils/supabase/server.ts` (Server Component / Action Supabase client with cookies)
- `src/utils/supabase/middleware.ts` (Session refresh helper)
- `src/middleware.ts` (Next.js middleware interceptor)
- `src/app/login/page.tsx` & `src/app/login/actions.ts` (Authentication UI and server actions)
- `src/app/auth/callback/route.ts` (OAuth / email confirmation callback)
- `src/app/auth/signout/route.ts` (Sign out endpoint)
- `src/app/dashboard/page.tsx` (Protected user dashboard)
- `supabase/migrations/20261012000000_create_interview_tables.sql` (PostgreSQL DDL schema)
- `src/types/database.ts` (TypeScript interfaces for DB entities)
- `docs/DATABASE_DESIGN.md` (Entity relationship diagram and architecture)

**What was implemented:**
1. Secure cookie-based authentication flow leveraging `@supabase/ssr` with Next.js App Router.
2. Route protection: Unauthenticated users visiting `/dashboard` are redirected to `/login`, and user sessions are refreshed via middleware.
3. PostgreSQL database schema containing `interviews`, `questions`, `answers`, and `evaluations`.
4. High-performance indexing on all foreign key columns (`user_id`, `interview_id`, `question_id`, `answer_id`) to avoid sequential scans during JOINs and cascade operations.
5. Strict Row-Level Security (RLS) policies for SELECT, INSERT, UPDATE, and DELETE across all tables, optimized using `(SELECT auth.uid())` to prevent per-row function evaluation.

**How it works:**
- When a user submits credentials in `/login`, Next.js Server Actions call `supabase.auth.signInWithPassword()` or `supabase.auth.signUp()`.
- Supabase sets session cookies via HTTP headers.
- On each subsequent request, `middleware.ts` calls `supabase.auth.getUser()`, validating the JWT and refreshing expired tokens.
- Protected Server Components like `/dashboard` read the authenticated user securely on the server without leaking keys or tokens.
- In PostgreSQL, queries sent by authenticated users are restricted by RLS: a user can only query or mutate rows where the interview's `user_id` matches their own `auth.uid()`.

**Dependencies introduced:**
- `@supabase/ssr` (Next.js App Router cookie handling)
- `@supabase/supabase-js` (PostgreSQL and Auth client)

**Known Limitations:**
- The SQL migration file must be executed in the Supabase Dashboard SQL Editor (or via CLI) on the connected project to create the tables in the cloud database.

**Next Steps:**
Proceed to Milestone 3: AI Interview generation flow (pull local Ollama model and build the interview configuration/practice UI).

---

## Milestone 3: Interview Setup, AI Question Generation & Session Workflow
**Date:** 2026-10-12

**Task Objective:**
Build the end-to-end interview workflow: configuration UI, local AI question generation via Ollama with schema validation, answer submission, session tracking, and dashboard history.

**Files Created / Modified:**
- `src/lib/validations/interview.ts` (Zod schemas for configuration input and structured AI output)
- `src/app/interview/actions.ts` (Server actions for interview creation, question generation, and answer saving)
- `src/app/interview/new/page.tsx` (Interactive interview configuration screen)
- `src/app/interview/[id]/page.tsx` (Interview session question-answering and completion summary view)
- `src/app/dashboard/page.tsx` (Dashboard with aggregate stats, active sessions list, and setup link)
- `src/utils/ai/ollama.ts` (Centralized Ollama client with fallback)

**What was implemented:**
1. **Interview Configuration Form (`/interview/new`)**:
   - Allows users to select Target Role, Experience Level, Focus Topics, Difficulty, and Duration.
   - Validates all input values server-side using Zod schemas.
2. **Local AI Question Generation with Ollama**:
   - Uses `generateObject()` with model `llama3.2` to generate structured questions adhering to `generatedQuestionsSchema`.
   - Generates practical, role-specific questions with topics, prompts, rubrics, and progressive hints.
   - Saves generated questions in Supabase `questions` table linked to the created interview.
   - Implements safe error recovery: catches offline/missing model errors and presents a non-crashing alert with recovery guidance.
3. **Interactive Session Page (`/interview/[id]`)**:
   - Enforces authentication and user ownership.
   - Tracks answering progress with visual progress bar.
   - Allows text/code submission for each question, saving responses to Supabase `answers`.
   - Detects when all questions are answered, marks status as `completed`, and renders the full review summary.
4. **Enhanced Dashboard (`/dashboard`)**:
   - Displays real-time aggregate statistics (Total, In Progress, Completed).
   - Lists recent interview sessions with status tags, role badges, and direct links to continue or review.
   - Displays friendly migration instruction banner if remote database tables have not been created yet.

**How it works:**
- A user submits the configuration form on `/interview/new`.
- `createInterviewAction` runs on the server, creates an `interviews` row, prompts local Ollama via the OpenAI-compatible `/v1` endpoint, parses and validates the generated question array with Zod, and inserts them into `questions`.
- The user is redirected to `/interview/[id]`, which serves each question one-by-one.
- Submissions trigger `submitAnswerAction`, recording candidate answers in `answers` and transitioning the interview state.

**Dependencies introduced:**
- `@ai-sdk/openai` (Ollama `/v1` compatibility layer)
- `zod` (Input and LLM schema validation)

**Next Steps:**
Proceed to Milestone 4: Automated Evaluation & Feedback Report.

---

## Milestone 4: Automated AI Evaluation Engine & Performance Reports
**Date:** 2026-10-12

**Task Objective:**
Implement automated, structured AI evaluation of candidate answers using Ollama (`llama3.2`) with numerical scores, performance verdicts, detailed constructive feedback, strengths, and areas for improvement, stored in PostgreSQL and rendered in a comprehensive report view.

**Files Created / Modified:**
- `src/lib/validations/evaluation.ts` (Zod schema for structured evaluation results)
- `src/app/interview/actions.ts` (Automatic evaluation invocation on answer submission and storage in `evaluations` table)
- `src/app/interview/[id]/page.tsx` (Completed session view with aggregate score, question breakdown, strengths, and areas to improve)

**What was implemented:**
1. **Zod Evaluation Schema**:
   - `score` (0–100 integer), `performanceVerdict` (Exceptional, Strong Pass, Borderline, Needs Improvement).
   - `feedback`, `strengths`, `areasForImprovement`, `idealKeyPoints`.
2. **Automated Submission Evaluation**:
   - Submitting an answer invokes local Ollama with GPU acceleration against the question prompt, topic, difficulty, and rubric.
   - Evaluated data is serialized and stored in Supabase's `evaluations` table.
3. **Comprehensive Performance Report**:
   - Overall score card with calculated average.
   - Question-by-question breakdown showing candidate solution, score badge, feedback, bulleted strengths, and areas to improve.

---

## Milestone 5: Brand Identity & High-Converting Landing Page
**Date:** 2026-10-13

**Task Objective:**
Replace the default Next.js starter page with a production-grade, responsive, dark-mode landing page showcasing product capabilities, technical architecture, and direct entry points.

**Files Created / Modified:**
- `src/app/page.tsx` (Complete landing page with hero, live preview, bento grid, lifecycle stepper, architecture breakdown, rubric tiers, and CTA)
- `src/app/layout.tsx` (Updated site title, meta description, and Geist font configuration)
- `src/app/globals.css` (Smooth scrolling and Geist typography tokens)

**What was implemented:**
1. **Brand Identity & Sticky Navbar**:
   - Logo, navigation links (Features, How It Works, Architecture, Rubric), GitHub repository link, and dynamic auth button (shows "Dashboard" if logged in, "Sign In" if guest).
2. **Hero Section with Ambient Lighting**:
   - Announcement badge highlighting 100% local Ollama inference, ₹0 cost, and zero data leakage.
   - Bold typography, engaging value proposition, and dual call-to-actions.
   - Interactive glassmorphism Terminal Simulator showing a live question, candidate solution, and instant AI rubric evaluation.
3. **Core Capabilities Bento Grid**:
   - Cards highlighting local GPU inference, PostgreSQL RLS, Zod schema validation, actionable feedback, topic customization, and session durability.
4. **Transparent Engineering Showcase**:
   - Architectural deep-dive cards explaining Next.js App Router Server Components, PostgreSQL RLS scalar subqueries, and OpenAI `/v1` compatibility.
5. **Rubric Tiers Section**:
   - Standardized scoring breakdown (Exceptional 85–100, Strong Pass 70–84, Borderline 55–69, Needs Improvement <55).

**Next Steps:**
Proceed to Milestone 6: Interactive Coding Workspace (Monaco Editor, Timer, and Progressive Hints).

---

## Milestone 6: Monaco Code Workspace, Live Timer & Progressive Hints
**Date:** 2026-10-13

**Task Objective:**
Upgrade the active interview session into an interactive coding workspace featuring the Monaco Editor (VS Code engine in the browser), dual code/architecture tabs, language switching, real-time countdown timer, progressive hint disclosure, and responsive submission states.

**Files Created / Modified:**
- `src/app/interview/[id]/InterviewWorkspace.tsx` (Client component featuring dynamic Monaco Editor, tab toggle, live timer, progressive hints accordion, and transition states)
- `src/app/interview/[id]/page.tsx` (Integrated InterviewWorkspace, parsed stored hints with fallback guidance, and expanded layout to `max-w-5xl`)
- `src/app/interview/actions.ts` (Serialized hints into question rubrics and parsed rubric strings cleanly during answer evaluation)
- `package.json` (Added `@monaco-editor/react`)

**What was implemented:**
1. **Monaco Code Editor (`@monaco-editor/react`)**:
   - Dynamically loaded with `ssr: false` to eliminate SSR window/DOM hydration errors.
   - Customized with `vs-dark` theme, Geist Mono font, bracket pair colorization, line numbers, word wrap, and automatic resizing.
   - Multi-language support: TypeScript, JavaScript, Python, and SQL with tailored boilerplate templates.
2. **Dual Mode Workspace (Code IDE & Architecture Notes)**:
   - Candidates can alternate between writing runnable code and drafting architectural diagrams, time/space complexity ($O(N)$) analysis, and trade-off notes.
   - When submitting, both code and notes are automatically structured and forwarded to the local AI evaluator.
3. **Live Interview Timer**:
   - Client-side countdown ticking down from the interview's configured duration (e.g. 30 minutes).
   - Visual state indicators: normal indigo badge, amber warning when under 5 minutes, red pulsating badge when under 1 minute.
   - Includes Pause and Resume controls.
4. **Progressive Hints Drawer**:
   - Unlocks progressive hints sequentially (Hint 1, then Hint 2) so candidates can get unstuck without revealing the full solution.
   - Explains that minimal hint usage is standard practice in real engineering interviews.
5. **Evaluation Progress Feedback**:
   - Submitting an answer triggers `useTransition`, providing an animated spinner and *"Evaluating with Ollama AI..."* status indicator.

**Next Steps:**
Proceed to Milestone 7: Live AI Interviewer Chat & Follow-ups.

---

## Milestone 7: Live AI Interviewer Chat & Streaming Follow-ups
**Date:** 2026-10-13

**Task Objective:**
Implement real-time conversational streaming dialogue during active interview sessions, allowing candidates to ask clarifying questions about constraints, test their assumptions, and receive Socratic guidance without leaking complete code solutions.

**Files Created / Modified:**
- `src/app/api/chat/route.ts` (Streaming chat route using `streamText()` with local Ollama `llama3.2` and strict Principal Engineer persona system prompt)
- `src/app/interview/[id]/InterviewWorkspace.tsx` (Slide-over chat drawer, quick prompt chips, autoscrolling chat history, and chunked `ReadableStream` reader)
- `src/app/interview/[id]/page.tsx` (Forwarded candidate target role to the workspace component)

**What was implemented:**
1. **Principal Engineer Interviewer Persona System Prompt**:
   - Instructs the LLM to behave like a senior technical interviewer at a tier-1 tech company.
   - Actively prevents code leakage: never returns full solutions or implementations, guiding the candidate with targeted Socratic questions, boundary conditions, and complexity trade-offs instead.
   - Considers full context: aware of candidate target role, problem topic, difficulty, prompt description, and candidate's current draft code in Monaco Editor.
2. **HTTP Chunked Streaming (`streamText` & `result.toTextStreamResponse()`)**:
   - Returns chunks with `Transfer-Encoding: chunked`, delivering tokens directly from local GPU Ollama to the browser as they are generated.
   - Avoids high-latency waiting periods typical of non-streaming REST endpoints.
3. **Interactive Slide-over Chat Drawer**:
   - Easily opened and closed alongside the Monaco Editor and architecture notes.
   - Distinct visual roles: candidate messages highlighted in indigo, interviewer responses in dark glassmorphism cards.
   - Visual streaming indicator (*"Thinking..."*) and smooth auto-scroll to latest response.
4. **Quick Suggestion Chips**:
   - Fast one-click prompts for common interview inquiries: *"Clarify problem constraints"*, *"What edge cases to consider?"*, and *"Review current approach"*.
5. **React 19 & Compiler Purity Architecture**:
   - Extracted streaming and ID creation helpers (`streamChatResponse`, `createChatMessage`) to module scope to strictly adhere to React 19's `react-hooks/purity` and `react-hooks/immutability` lint checks.

**Next Steps:**
Proceed to Milestone 8: Safe Isolated Code Execution Sandbox or Advanced Candidate History & Analytics.

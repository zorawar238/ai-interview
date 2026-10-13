# Learning Roadmap

This document tracks the core concepts we will learn while building this platform.

## Phase 1: Application Foundation
- [x] **Next.js App Router:** Understanding Server Components vs. Client Components.
- [x] **API Routes:** Building RESTful endpoints in Next.js.
- [x] **Environment Variables:** Securely storing configuration (like Supabase URLs).
- [x] **TypeScript:** Defining interfaces for our data to catch bugs early.

## Phase 2: Database & Authentication
- [x] **Relational Databases (SQL):** Understanding Tables, Primary Keys, Foreign Keys, CASCADE rules, and Indexes.
- [x] **Authentication vs. Authorization:** The difference between identifying a user (Supabase Auth) and checking row permissions (Postgres RLS).
- [x] **Supabase Auth:** Handling sessions and JWT tokens securely with SSR cookies.

## Phase 3 & 4: AI Integration with Ollama
- [x] **Prompt Engineering:** Designing prompts to get consistent results.
- [x] **Structured Outputs:** Forcing an LLM to return valid JSON (critical for application state).
- [x] **Local LLMs:** Understanding how models run via Ollama and handling latency/streaming.

## Phase 5: State Management, Live Streaming & UI
- [x] **React State:** Managing the interview flow (Monaco editor, live countdown timer, progressive hints).
- [x] **Asynchronous Programming:** Handling promises and useTransition when waiting for AI responses.
- [x] **Real-Time Streaming Dialogue:** HTTP Chunked transfer (`ReadableStream`, `TextDecoder`) vs WebSockets, Socratic interviewer system prompts.

## Phase 6: Code Execution Sandbox (Future)
- [ ] **Process Isolation:** Why we never run `eval()` on user code.
- [ ] **Sandboxing:** How services like Piston use Docker/containers to isolate execution.

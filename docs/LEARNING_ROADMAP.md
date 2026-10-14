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

## Phase 6: Code Execution Sandbox & Process Isolation
- [x] **Process Isolation:** Why we never run `eval()` on user code, stripped environment variables (`safeEnv`), and hard execution timeouts.
- [x] **Sandboxing Architecture:** Subprocess runners (`child_process.spawn`), native Node 24 `--experimental-strip-types`, Python `-u`, and in-memory SQLite sandboxing.

## Phase 7: Candidate Analytics & Data Visualization
- [x] **Relational Batch Aggregations:** Eliminating N+1 query overhead via SQL `IN (...)` and in-memory Map lookups.
- [x] **Vector SVG Data Visualization:** Rendering mathematical SVG trendlines and gradient fills with zero third-party bundle weight.
- [x] **Multi-Dimensional Progress Tracking:** Calculating topic proficiency mastery and historical score trajectories.

## Phase 8: Adaptive LLM Calibration & Dynamic State Machines
- [x] **Dynamic Multi-Turn AI Calibration:** Transitioning from static batch question generation to feedback-driven progressive single-question generation.
- [x] **Mathematical Performance Thresholds:** Implementing discrete escalation ($\ge 80\%$), scaffolding ($< 60\%$), and lateral domain rotation ($60–79\%$).
- [x] **Fault-Tolerant AI Workflows:** Preventing application deadlocks with deterministic fallback generators when local models experience latency or transient failures.

## Phase 9: In-Browser Web Speech & Multimodal Voice Interfaces
- [x] **Native Browser Speech APIs:** Leveraging `window.SpeechRecognition` / `webkitSpeechRecognition` for zero-cloud acoustic transcription and `window.speechSynthesis` for vocal articulation.
- [x] **React 19 External Store Synchronization:** Utilizing `useSyncExternalStore` to read non-React platform APIs (speech recognition availability, dynamic voice lists) without triggering cascading renders or hydration mismatch.
- [x] **Audio Content Sanitization:** Preprocessing markdown AST and code blocks into speech-friendly natural prose.



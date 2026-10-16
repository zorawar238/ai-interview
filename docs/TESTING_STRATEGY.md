# Testing Strategy — AI Coding Interview Platform

This document outlines the testing architecture, testing principles, automated test suite, and verification protocols for the AI Coding Interview Platform.

---

## 1. Testing Philosophy & Principles

Technical interview platforms require high reliability across two fundamentally different domains:

1. **Deterministic Subsystems (Code Execution, Scoring Math, Schema Validation, Auth, RLS)**:
   - Must be tested with 100% deterministic, repeatable assertions.
   - Code sandbox limits, syntax boundaries, timeouts, and difficulty adjustment math must never vary across test runs.
2. **Non-Deterministic Subsystems (LLM Inference via Ollama / `llama3.2`)**:
   - AI outputs must never be treated as raw untyped strings.
   - All AI responses are validated at runtime against strict **Zod schemas** (`singleQuestionSchema`, `evaluationSchema`).
   - Non-deterministic network calls or local inference timeouts are decoupled from the test suite via deterministic fallbacks and unit test mocks.
   - **Guaranteed Fallback Invariant**: When local Ollama is offline or experiences transient latency, the system deterministically emits structured fallback questions so candidate sessions never freeze.

---

## 2. Testing Pyramid & Test Architecture

```
                    ┌────────────────────────┐
                    │    Manual / Browser    │
                    │   End-to-End Sessions  │
                    │   (Speech, Monaco UI)  │
                    └───────────┬────────────┘
                                │
                    ┌───────────┴────────────┐
                    │   Integration Testing  │
                    │   - Sandbox Isolation  │
                    │   - Fallback Engine    │
                    │   - Health Endpoint    │
                    └───────────┬────────────┘
                                │
                    ┌───────────┴────────────┐
                    │      Unit Testing      │
                    │  - Adaptive Calc Math  │
                    │  - Schema Validations  │
                    │  - Question Target Ct  │
                    └────────────────────────┘
```

### Test Runner: Vitest (Native ESM + Node 22)
We chose **Vitest** for its:
- Native ESM support (`vitest.config.mts`) and fast execution via Rolldown/Vite.
- First-class TypeScript support without heavy babel/ts-jest transpilation overhead.
- Native path alias support matching Next.js `@/*` resolution.
- Blazing execution speed: entire test suite executes in **< 300ms**.

---

## 3. Test Suites & Coverage

### 3.1 Adaptive Difficulty Engine (`src/lib/adaptive/__tests__/engine.test.ts`)
Validates the dynamic multi-turn interview difficulty engine:
- **`getTargetQuestionCount`**:
  - $\le 15$ minutes $\to$ 2 questions
  - $\le 30$ minutes $\to$ 3 questions
  - $\le 45$ minutes $\to$ 4 questions
  - $\ge 60$ minutes $\to$ 5 questions
- **`calculateAdaptiveStep`**:
  - **High Performance ($\text{Score} \ge 80$)**: Tests escalation from Easy $\to$ Medium, Medium $\to$ Hard, and capping at Hard.
  - **Low Performance ($\text{Score} < 60$)**: Tests scaffolding descent from Hard $\to$ Medium, Medium $\to$ Easy, and maintaining Easy.
  - **Moderate Performance ($60 \le \text{Score} < 80$)**: Tests lateral topic transitions while maintaining current difficulty tier.
  - **Topic Rotation**: Verifies that topics rotate across unused domains and cycle back gracefully once exhausted.
- **Fallback Resilience (`generateAdaptiveQuestion`)**:
  - Simulates model failure / connection timeout.
  - Verifies that `generateAdaptiveQuestion` returns a fully formed, valid fallback `SingleQuestion` with hints and rationale without throwing unhandled exceptions.

### 3.2 Code Execution Sandbox Validation (`src/lib/validations/__tests__/execution.test.ts`)
Validates input and output contracts for [`src/app/api/execute/route.ts`](../src/app/api/execute/route.ts):
- **Language Whitelist**: Validates `typescript`, `javascript`, `python`, `sql`.
- **Negative Rejection**: Rejects unauthorized runtime languages (e.g. `c++`, `ruby`, `rust`).
- **Input Boundaries**: Enforces non-empty code submissions (`code: ""`) and rejects oversized payloads ($> 50\text{ KB}$).
- **Response Format**: Verifies status contracts (`success`, `error`, `timeout`), null exit codes on timeouts, and execution duration measurements.

### 3.3 Evaluation & Interview Setup Schema (`src/lib/validations/__tests__/evaluation.test.ts`)
Validates structured AI output contracts:
- **`evaluationSchema`**:
  - Enforces score bounds: $0 \le \text{score} \le 100$. Rejects negative and excessive numbers.
  - Enforces performance verdict enum: `Exceptional`, `Strong Pass`, `Borderline`, `Needs Improvement`.
  - Enforces structured arrays for strengths, areas for improvement, and ideal key points.
- **`createInterviewSchema`**:
  - Enforces role string minimum length ($\ge 2$).
  - Rejects empty topic selections.
  - Enforces duration boundaries ($15 \le \text{duration} \le 60$).
  - Validates default interview mode (`adaptive`).

---

## 4. How to Run Tests

### Running the Test Suite (One-Shot)
```bash
npm test
```

### Running Tests in Watch Mode (TDD)
```bash
npm run test:watch
```

### Running Next.js Build & Lint Verification
```bash
npm run lint
npm run build
```

---

## 5. Security & Sandbox Testing Guidelines

1. **Never commit credentials**: Tests must never rely on real Supabase service role keys or private secrets.
2. **Process Sandboxing**: The code runner executes child processes inside temporary OS directories with:
   - Safe environment variable pass-through (`safeEnv` containing only essential runtime paths, explicitly omitting any `.env` secrets).
   - Strict 5000ms execution timeout (`SIGKILL` on breach).
   - Max 64KB output buffer to prevent buffer overflow attacks.
3. **Deterministic Separation**: In performance reports, deterministic code test results must remain visually and conceptually separated from subjective LLM feedback.

---

## 6. Acceptance Criteria Checklist (Per PRD §14)

- [x] Application builds with zero TypeScript errors on Next.js 16 Turbopack.
- [x] Unit test suite runs with 100% pass rate in $< 500\text{ms}$.
- [x] Code execution boundary rules reject empty, invalid, or oversized payloads.
- [x] Adaptive calibration transitions adhere strictly to documented score thresholds.
- [x] Graceful fallbacks deploy when local Ollama is offline or times out.
- [x] Health check endpoint `/api/health` returns status `200 OK` without requiring authentication.

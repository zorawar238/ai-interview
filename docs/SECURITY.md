# Security Architecture & Trust Boundaries

This document defines the security posture, threat model, and defense-in-depth mitigations implemented across DevInterview.ai.

---

## 1. Authentication & Session Security
* **Protocol:** Supabase Auth utilizing RFC 7519 JSON Web Tokens (JWTs).
* **Storage:** Auth session tokens are stored in secure, `HttpOnly`, `SameSite=Lax` cookies managed by `@supabase/ssr`.
* **Zero Client-Side Token Storage:** Tokens are never placed in browser `localStorage` or `sessionStorage`, protecting users against Cross-Site Scripting (XSS) token exfiltration attacks.
* **Server Verification:** Every protected route and server action validates session identity via `supabase.auth.getUser()`, which cryptographicly verifies the JWT signature against Supabase public keys and refreshes expired sessions in `middleware.ts`.

---

## 2. Database Authorization: Row-Level Security (RLS)
* **Kernel-Level Enforcement:** Data isolation is enforced inside the PostgreSQL database engine via Row-Level Security, not application-level filters.
* **Scalar Subquery Optimization:** Policies use `((SELECT auth.uid()) = user_id)` rather than volatile `auth.uid() = user_id`, caching the user ID per statement execution to eliminate N-times function evaluation overhead while preserving bulletproof row access boundaries.
* **Cascading Integrity:** All relational child rows (`questions`, `answers`, `evaluations`) reference their parent `interviews` row with `ON DELETE CASCADE` and subquery verification policies.

---

## 3. Code Execution Sandbox Security (FR-08)

Executing arbitrary, untrusted code provided by interview candidates represents the highest security risk surface in a coding interview platform.

### Threat Model & Defense Mechanisms

| Threat Vector | Attack Scenario | DevInterview.ai Defense |
| :--- | :--- | :--- |
| **Remote Code Execution (RCE)** | Candidate runs code that takes over the web server or modifies source code. | **Process Separation:** Candidate code is NEVER executed inside the main Next.js Node.js server. Code is spawned in isolated child processes (`node` or `python`) in ephemeral temporary directories. |
| **Credential & Secret Theft** | Candidate writes `console.log(process.env)` to read `SUPABASE_SERVICE_ROLE_KEY` or database secrets. | **Sanitized Environment (`safeEnv`):** The spawned process receives a sanitized environment containing ONLY system paths (`PATH`, `TEMP`, `SYSTEMROOT`). All application credentials and secrets are stripped. |
| **Denial of Service (Infinite Loops)** | Candidate writes `while(true) {}` to starve CPU resources and freeze web threads. | **Hard 5000ms Timeout:** The API runner sets an unyielding 5-second timer. If execution does not complete, the runner sends `SIGKILL` (and Windows `taskkill /F /PID /T`) to terminate the process and all spawned sub-threads. |
| **Memory Exhaustion (OOM Flooding)** | Candidate outputs gigabytes of text (`while(true) console.log('A')`) to crash server RAM. | **Capped Stream Buffers:** Both `stdout` and `stderr` streams are bounded at a maximum of 64 KB. Further incoming chunks are silently discarded. |
| **Unauthorized Execution Abuse** | An unauthenticated attacker attempts to flood the execution endpoint as a free compute proxy. | **Session Authentication:** The `/api/execute` endpoint requires an authenticated Supabase user session (`supabase.auth.getUser()`), rejecting unauthorized requests with HTTP 401. |
| **Filesystem Pollution** | Candidate code creates files or leaves clutter on the host disk. | **Ephemeral Sandbox Dir:** Each execution runs in a uniquely generated directory created via `fs.mkdtemp`. In a `finally` block, the directory and its contents are recursively removed (`fs.rm`). |

---

## 4. AI Prompt Injection & Solution Leakage
* **System Prompt Guardrails:** System prompts instruct the model using explicit negative constraints (`"NEVER write complete solutions"`, `"NEVER provide more than 2 lines of pseudo-code"`).
* **Role Invariants:** The LLM is framed as a Principal Engineer / Bar Raiser evaluating candidate thinking, requiring Socratic questioning rather than solution generation.
* **Zero External API Costs & Data Privacy:** All AI inferences run on local Ollama models (`llama3.2`) over localhost. Candidate code, interview questions, and evaluations are never transmitted to external cloud LLM providers.

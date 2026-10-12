# AI Coding Agent Rules — AI Coding Interview Platform

These rules apply to every task in this repository. The goal is to build a reliable project **and** help the project owner understand it well enough to explain it in technical interviews.

## 1. Core priorities

1. Correctness and security come before speed.
2. Teaching and understanding are as important as implementation.
3. Prefer the simplest design that meets the current requirements.
4. Make small, reviewable, testable changes.
5. Keep documentation synchronized with the code.
6. Never claim something works unless it has been verified.

## 2. Before changing code

- Inspect the existing repository, relevant files, dependencies, and current conventions.
- Read `PRD_AI_Coding_Interview_Platform.md` and relevant files in `docs/` when available.
- Identify existing work that must be preserved.
- Explain the problem, proposed solution, affected files, important tradeoffs, and verification plan before significant changes.
- Ask for approval before major architectural changes, costly services, security-sensitive changes, destructive operations, or adding substantial dependencies.
- Do not overwrite, delete, or rewrite working code without a clear reason and an explained plan.

## 3. Work incrementally

- Do not build the whole product in one shot.
- Follow the PRD milestones and complete one coherent feature at a time.
- Keep changes focused; avoid mixing unrelated refactors with feature work.
- Define acceptance criteria before implementation.
- After each milestone, summarize what works, what was tested, what remains, and what I learned.
- Wait for approval before moving to the next major phase.

## 4. Teach while building

For each meaningful feature:

1. Explain the problem in plain English.
2. Define unfamiliar technical terms.
3. Explain the design and data/request flow.
4. Compare relevant alternatives and tradeoffs.
5. Implement the smallest coherent change.
6. Explain the important files, functions, and code paths.
7. Identify likely failure cases and security implications.
8. Ask 2–3 targeted comprehension questions at major checkpoints.

Do not assume that generated code is understood merely because it was accepted. Avoid unnecessary abstractions and libraries. Explain any important complexity introduced by a dependency or framework.

## 5. Engineering decisions

Record significant decisions in `docs/DECISION_LOG.md` using this structure:

- Problem and context
- Options considered
- Chosen decision
- Reasoning and evidence
- Tradeoffs
- Rejected alternatives and why
- Consequences
- Conditions that would justify revisiting the decision
- Related files and tests

Distinguish facts from assumptions. Do not invent historical reasoning. If a decision changes, mark the previous decision as superseded rather than erasing the history.

## 6. Documentation rules

Update relevant documentation in the same task as the code change. Keep these files current where applicable:

- `docs/PROJECT_VISION.md`
- `docs/LEARNING_ROADMAP.md`
- `docs/SYSTEM_ARCHITECTURE.md`
- `docs/DECISION_LOG.md`
- `docs/IMPLEMENTATION_LOG.md`
- `docs/DEBUGGING_LOG.md`
- `docs/API_SPECIFICATION.md`
- `docs/DATABASE_DESIGN.md`
- `docs/TESTING_STRATEGY.md`
- `docs/SECURITY.md`
- `docs/AI_ENGINEERING.md`
- `docs/INTERVIEW_PREPARATION.md`
- `docs/GLOSSARY.md`
- `docs/KNOWN_LIMITATIONS.md`
- `docs/RELEASE_NOTES.md`

Do not create empty documents just to claim completion. If a document is not yet relevant, state that and create it when needed. Never include secrets, credentials, tokens, or unnecessary personal data in documentation.

## 7. Testing and truthful reporting

- Run the relevant tests, linting, type checks, and build checks that are available.
- Add tests for new behavior and regression tests for fixed bugs.
- Report the exact commands run and whether they passed or failed.
- Clearly identify checks that could not be run and why.
- Never fabricate test results, API responses, benchmarks, deployments, or successful integrations.
- Do not confuse valid JSON from an LLM with a correct answer.
- For variable AI behavior, test required structure, constraints, error handling, and quality properties separately.

## 8. Debugging protocol

When something fails:

1. Capture the actual symptom and error.
2. Reproduce it where possible.
3. Identify the likely layer and form testable hypotheses.
4. Investigate using logs, tests, and minimal experiments.
5. Find the root cause rather than hiding the symptom.
6. Apply the smallest reasonable fix.
7. Rerun the relevant test and regression checks.
8. Explain why the fix works and how to prevent recurrence.
9. Record meaningful incidents in `docs/DEBUGGING_LOG.md`.

Do not suppress errors, disable tests, or make unrelated changes merely to obtain a passing result. Never log secrets.

## 9. Architecture and dependencies

- Prefer a modular monolith for the initial product.
- Avoid premature microservices, Kubernetes, distributed infrastructure, and unnecessary design patterns.
- Introduce Redis, queues, vector databases, WebSockets, or agent frameworks only when a real requirement justifies them.
- Keep AI provider calls behind a clear service boundary.
- Validate all external inputs and model outputs.
- Keep deterministic application rules separate from LLM-generated suggestions.
- Use TypeScript types and clear module responsibilities.
- Follow existing conventions unless there is a documented reason to change them.

## 10. AI-specific rules

- Treat model output as untrusted input; validate it before use.
- Use structured output and schema validation when a predictable shape is required.
- Bound token usage, request size, retries, and follow-up counts.
- Handle timeouts, rate limits, quota exhaustion, malformed responses, and provider outages.
- Keep interview state transitions, access control, and critical business rules under application control—not solely under the LLM.
- Explain where AI evaluations are subjective or unreliable.
- Distinguish deterministic code-test results from AI-generated qualitative feedback.
- Use RAG only when retrieval adds real value. Treat retrieved documents as untrusted content and evaluate relevance.
- Never claim company-specific questions are actual or verified interview questions unless there is reliable evidence.

## 11. Security and privacy

- Never hardcode secrets or commit real `.env` files.
- Keep provider secrets on the server; never expose them in browser code.
- Enforce authorization on every user-owned resource. Knowing an ID is not authorization.
- Use safe database access and input validation.
- Consider rate limiting, abuse, prompt injection, sensitive logging, and common web vulnerabilities.
- Minimize stored personal data and document retention assumptions.
- Never execute arbitrary candidate code inside the main application server or API process.
- Use an isolated code execution service or sandbox with time and resource limits where supported.
- Do not expose secrets to the code runner or reveal private test cases unnecessarily.
- Clearly distinguish implemented security controls from planned controls and known gaps.

## 12. Cost and external services

- Aim for a ₹0 development setup where practical.
- Before adding a paid service, explain its purpose, alternatives, free-tier limits, possible charges, and failure behavior.
- Obtain approval before introducing a cost or paid dependency.
- Never promise unlimited free usage.
- Use bounded calls and sensible usage limits.
- Make provider-specific behavior explicit; add abstractions only when they provide real value.

## 13. Git and change safety

- Check Git status before risky changes.
- Do not discard user changes or overwrite uncommitted work.
- Keep changes small and reviewable.
- Explain important diffs and generated files.
- Recommend checkpoints or commits after verified milestones.
- Never rewrite history, delete branches, remove data, or perform destructive operations without explicit approval.

## 14. Definition of done

A task is complete only when:

- Its acceptance criteria are met or remaining gaps are explicitly listed.
- The implementation is integrated and reviewed.
- Relevant tests have actually been run.
- Important edge cases and security implications have been considered.
- Relevant documentation is updated.
- Known limitations are recorded.
- The project owner receives an explanation of how the feature works.
- The next recommended step is clear.

## 15. Required completion summary

At the end of each meaningful task, report:

1. **Implemented:** what changed.
2. **Files changed:** paths and purpose.
3. **Decisions:** important choices and rationale.
4. **Verification:** exact checks and actual results.
5. **Problems and fixes:** root causes where applicable.
6. **Documentation:** updated documents.
7. **Limitations:** what remains unverified or incomplete.
8. **Learning checkpoint:** concepts to understand and interview questions.
9. **Next step:** one recommended next task.

## 16. First-run behavior

On the first run, inspect the workspace and read the PRD before coding. Propose the MVP, architecture, documentation plan, risks, and first milestone. Create only the initial planning documentation. Wait for approval before major implementation.

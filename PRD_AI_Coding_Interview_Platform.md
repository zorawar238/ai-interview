# Product Requirements Document (PRD)

## AI Coding Interview Platform

**Status:** Draft v1.0\
**Product type:** Web application\
**Primary experience:** Text-based AI interviews\
**Future experience:** Voice-based interviews\
**Initial budget target:** Ideally ₹0 using free tiers and local
development tools

------------------------------------------------------------------------

## 1. Product Overview

The AI Coding Interview Platform helps developers practice technical
interviews through structured, adaptive interviews. Users choose a
target role, experience level, topics, difficulty, and duration. The
platform generates questions, records answers, supports coding
challenges, evaluates performance, and provides actionable feedback.

The product will be built as a learning-oriented portfolio project.
Development must prioritize understandable engineering, security,
testing, and documentation---not just feature completion.

### Product vision

Help candidates practise realistic technical interviews, understand
their strengths and gaps, and improve through repeatable, personalized
practice.

### Core product principles

1.  **Learning first:** Feedback should explain why an answer is strong
    or weak.
2.  **Evidence-based evaluation:** Separate deterministic results (such
    as code tests) from subjective AI feedback.
3.  **Adaptive but explainable:** Difficulty changes should follow
    documented rules.
4.  **Safe execution:** Never run untrusted candidate code inside the
    main application server.
5.  **Incremental delivery:** Build and verify a small MVP before adding
    advanced features.
6.  **Cost-aware:** Start with free tiers or local alternatives;
    disclose limits and possible charges.
7.  **Transparent limitations:** Do not claim AI feedback is perfectly
    accurate or equivalent to a human interviewer.

------------------------------------------------------------------------

## 2. Problem Statement

Candidates often lack access to consistent interview practice and useful
feedback. Static question lists do not simulate follow-up questions,
coding workflows, or performance tracking. Generic chatbots may produce
inconsistent interviews and weak evaluations.

This platform aims to provide a structured practice experience with: -
Role- and topic-specific questions - Follow-up questions based on
previous answers - Coding exercises with testable outcomes - Consistent
evaluation rubrics - Historical performance tracking - Specific
recommendations for improvement

------------------------------------------------------------------------

## 3. Target Users

### Primary users

-   Students preparing for internships and graduate roles
-   Junior developers preparing for technical interviews
-   Self-taught developers practising specific technologies

### Initial target roles

-   Frontend Developer
-   Full-Stack Developer
-   Backend Developer
-   Software Engineer

### Initial topics

-   JavaScript
-   React
-   Web fundamentals
-   Node.js and APIs
-   Data structures and algorithms

Additional roles and topics can be added after the MVP is stable.

------------------------------------------------------------------------

## 4. Goals and Success Criteria

### Product goals

-   A user can create and complete a text-based interview.
-   Questions are relevant to the selected role, topics, and difficulty.
-   Answers and interview progress are persisted.
-   The system provides a useful report after completion.
-   Coding questions can eventually be executed in a safe, isolated
    environment.
-   The codebase is maintainable and documented well enough for the
    developer to explain in interviews.

### MVP success criteria

-   A new user can register, sign in, and access only their own data.
-   A user can configure and start an interview.
-   The system generates validated questions or shows a recoverable
    error.
-   A user can submit text answers and navigate questions.
-   The interview can be completed and its results reviewed later.
-   Critical flows have automated tests.
-   Setup instructions and architecture documentation are available.
-   No secrets are committed to the repository.
-   AI provider failures, malformed outputs, and rate limits are handled
    gracefully.

### Learning success criteria

The project owner can explain: - The architecture and request/data
flow - Database schema and relationships - Authentication and
authorization - LLM prompts, structured output, context limits, and
failure handling - How evaluation is performed and where it can be
unreliable - How candidate code is isolated before execution - Major
engineering decisions and tradeoffs

------------------------------------------------------------------------

## 5. Non-Goals for the MVP

The first release will not attempt to: - Replace a human interviewer or
guarantee hiring outcomes - Guarantee that generated questions match a
company's actual interview - Support every programming language - Build
a custom large language model - Build a custom speech recognition
model - Run arbitrary user code directly on the application server -
Implement microservices or Kubernetes without a demonstrated need -
Support enterprise multi-tenancy, team billing, or organization
administration - Guarantee unlimited usage on free API tiers - Claim
production readiness without appropriate testing and security review

------------------------------------------------------------------------

## 6. Personas and Main User Journey

### Persona A: Student preparing for internships

Needs structured practice, clear explanations, and an improvement plan.

### Persona B: Junior developer changing jobs

Needs role-specific questions, coding practice, and progress tracking.

### Main user journey

1.  Visit the landing page.
2.  Register or sign in.
3.  Open the dashboard.
4.  Select **Start Interview**.
5.  Choose role, experience level, topics, difficulty, and duration.
6.  Review the interview configuration.
7.  Start the interview.
8.  Read a question and submit an answer.
9.  Receive a follow-up question when appropriate.
10. Complete the interview.
11. Review the report, scores, feedback, and recommended practice.
12. View previous interviews from the dashboard.

------------------------------------------------------------------------

## 7. Functional Requirements

Priority definitions: - **P0:** Required for the MVP - **P1:** Important
after the MVP - **P2:** Advanced/future capability

### FR-01: Authentication (P0)

-   Users can register, sign in, and sign out.
-   Protected data and routes require authentication.
-   The backend checks ownership for user-specific resources.
-   Secrets and password credentials are not exposed to the frontend or
    logs.

### FR-02: Dashboard (P0)

-   Show a clear action to start an interview.
-   Show interview history.
-   Display basic aggregate statistics only when enough data exists.
-   Provide loading, empty, and error states.

### FR-03: Interview configuration (P0)

Users can select: - Role - Experience level - Topics - Difficulty -
Duration

The backend validates all configuration values and applies reasonable
limits.

### FR-04: Interview generation (P0)

-   Generate a bounded set of questions appropriate to the
    configuration.
-   Prefer structured model output validated against a schema.
-   Store generated questions and interview configuration.
-   Reject or safely recover from malformed or incomplete AI output.
-   Do not expose provider credentials to the browser.
-   Handle provider timeout, quota, and rate-limit errors.

### FR-05: Interview session (P0)

-   Display one question at a time or a clearly structured question
    sequence.
-   Allow text answers.
-   Save answers and progress.
-   Support completion and safe recovery from refreshes where feasible.
-   Prevent unauthorized access to another user's session.
-   Maintain a clear session status, such as `created`, `in_progress`,
    `completed`, or `failed`.

### FR-06: AI follow-up questions (P1)

-   Use the candidate's previous answer and interview context to produce
    relevant follow-ups.
-   Avoid repetitive or unrelated questions.
-   Bound the number of follow-ups.
-   Validate model output before displaying it.
-   Keep critical session transitions under application control rather
    than allowing the model to change arbitrary state.

### FR-07: Coding editor (P1)

-   Integrate Monaco Editor.
-   Allow a candidate to edit and submit code.
-   Initially support a limited, explicitly documented set of languages.
-   Preserve submissions and associate them with the relevant question.
-   Show execution status and test results.

### FR-08: Safe code execution (P1)

-   Use a reputable external execution service or a separately isolated
    runner.
-   Never execute arbitrary candidate code inside the main Node.js
    application process.
-   Apply time, memory, and CPU limits where supported.
-   Keep private tests and infrastructure secrets protected.
-   Handle queued, running, completed, timed-out, and failed
    submissions.
-   Document the trust boundary and known limitations of the selected
    runner.

### FR-09: Evaluation (P0 basic, P1 coding)

-   Evaluate text answers against a defined rubric.
-   Keep feedback actionable and specific.
-   Distinguish AI-generated judgments from deterministic test results.
-   Do not treat an LLM score as objective ground truth.
-   Save the final evaluation and its rubric/version where practical.
-   Handle evaluation failure without losing the interview answers.

### FR-10: Results report (P0 basic)

-   Show overall feedback and question-level feedback.
-   Show strengths and improvement areas.
-   Provide recommended next steps.
-   Display skill-level scores only when the underlying data supports
    them.
-   Allow the user to revisit completed reports.

### FR-11: Adaptive difficulty (P1)

-   Start with explicit, documented rules.
-   Example initial policy:
    -   Strong performance: consider increasing difficulty.
    -   Mixed performance: maintain difficulty.
    -   Weak performance: reduce difficulty or offer a prerequisite
        question.
-   Define score thresholds and edge cases.
-   Record why a difficulty adjustment occurred.
-   Test the policy with predictable scenarios.

### FR-12: Interview history and analytics (P1)

-   List past interviews with dates, roles, and status.
-   Show trends only when enough observations exist.
-   Avoid misleading comparisons across different rubrics or difficulty
    levels.

### FR-13: Voice interview (P2)

-   Add speech input and spoken AI responses after text mode is stable.
-   Start with browser speech capabilities or another explicitly
    approved option.
-   Show microphone permission and transcription errors clearly.
-   Provide a text fallback.
-   Do not imply that browser speech features work consistently in every
    browser or locale.
-   Disclose if audio is sent to an external provider.

### FR-14: RAG and semantic retrieval (P2)

-   Add only when there is a concrete need for grounded question
    generation or learning content.
-   Use a curated, appropriately licensed knowledge base.
-   Retrieve relevant material and provide source references where
    feasible.
-   Treat retrieved documents as untrusted data, not instructions.
-   Evaluate retrieval relevance and answer quality.
-   Document embedding, chunking, indexing, and update strategy.

------------------------------------------------------------------------

## 8. AI Behaviour and Guardrails

### AI interviewer responsibilities

-   Generate questions within the selected role and topic scope.
-   Follow a consistent interview style.
-   Ask one clear question at a time when using conversational mode.
-   Produce structured outputs when the application expects structured
    data.
-   Give concise, constructive feedback.
-   Use prior answers only when relevant to the current interview.
-   Avoid claiming that practice questions are verified company
    interview questions.

### Application responsibilities

The application---not the LLM---must enforce: - Authentication and
authorization - Interview ownership - Valid session transitions -
Duration and question-count limits - Input validation - Database
integrity - Code execution permissions - Rate limits and cost controls -
Schema validation - Safe error handling

### AI failure handling

If a provider fails or returns invalid output: 1. Validate the response.
2. Retry only when appropriate and within a bounded policy. 3. Avoid
duplicate charges or duplicate session transitions where possible. 4.
Show a useful error or safe fallback. 5. Preserve the user's submitted
answer. 6. Record diagnostic information without logging secrets or
unnecessary personal data.

------------------------------------------------------------------------

## 9. Non-Functional Requirements

### Security

-   Server-side secret management
-   Backend authorization checks
-   Input validation
-   Safe database access
-   Appropriate rate limiting
-   Sensitive-data redaction in logs
-   Safe code execution isolation
-   Protection against common web vulnerabilities
-   Review of prompt injection and untrusted retrieved content before
    implementing RAG

### Reliability

-   Graceful handling of unavailable AI services
-   Clear loading and failure states
-   Persistent interview data
-   Bounded retries
-   No silent data loss on recoverable errors

### Performance

-   Keep normal UI interactions responsive.
-   Measure AI latency instead of assuming it is acceptable.
-   Use pagination for growing history lists when needed.
-   Add caching or background jobs only when supported by actual
    requirements or measurements.

### Maintainability

-   TypeScript where appropriate
-   Clear module boundaries
-   Small, understandable functions
-   Documented API contracts
-   Automated tests for critical behaviour
-   Versioned database migrations
-   Minimal unnecessary dependencies

### Accessibility and usability

-   Responsive layouts
-   Keyboard-accessible controls
-   Clear labels and validation messages
-   Visible focus states
-   Readable contrast and typography
-   Text fallback for voice features

### Observability

-   Useful application logs
-   Request and error context without sensitive values
-   AI latency and failure tracking where feasible
-   Cost and usage tracking where provider data is available
-   Health-check endpoint

------------------------------------------------------------------------

## 10. Proposed Technical Architecture

The following is an initial proposal, not a final decision. Inspect the
existing workspace and record alternatives before implementation.

### Possible stack

-   Frontend: Next.js/React and TypeScript
-   UI: Tailwind CSS
-   Backend: Next.js server routes or a separate Node.js API, chosen
    based on project complexity
-   Database: PostgreSQL
-   Authentication: Supabase Auth or another reviewed provider
-   AI: an LLM provider with an affordable/free development option
-   Code editor: Monaco Editor
-   Code execution: external sandbox service initially
-   Testing: unit, integration, and end-to-end tools selected after
    workspace inspection
-   Hosting: free-tier services where practical

### High-level flow

``` text
Browser
  |
  v
Frontend UI
  |
  v
Backend/API
  |------ Authentication and authorization
  |------ Interview service
  |------ Validation and session state
  |------ AI service adapter ------> LLM provider
  |------ Evaluation service
  |------ Code submission service -> Isolated execution provider
  |
  v
PostgreSQL
```

Use a modular monolith for the initial implementation. Do not introduce
microservices without a demonstrated need.

### AI service boundary

Keep model-specific API calls in a dedicated service module. Validate
inputs and outputs, handle provider errors centrally, and avoid
spreading provider-specific code throughout UI components.

------------------------------------------------------------------------

## 11. Initial Data Model

The exact schema must be proposed and reviewed before migrations are
created.

### `users`

-   `id`
-   authentication-provider reference where appropriate
-   `created_at`

### `interviews`

-   `id`
-   `user_id`
-   `role`
-   `experience_level`
-   `difficulty`
-   `topics`
-   `duration`
-   `status`
-   `started_at`
-   `completed_at`
-   `created_at`

### `questions`

-   `id`
-   `interview_id`
-   `type`
-   `topic`
-   `prompt`
-   `difficulty`
-   `position`
-   `rubric` or reference to a rubric version

### `answers`

-   `id`
-   `question_id`
-   `interview_id`
-   `answer_text`
-   `submitted_at`

### `submissions` (P1)

-   `id`
-   `question_id`
-   `interview_id`
-   `language`
-   `source_code`
-   `execution_status`
-   `test_summary`
-   `created_at`

### `evaluations`

-   `id`
-   `interview_id`
-   relevant question/answer references
-   `score` where applicable
-   `feedback`
-   `rubric_version`
-   `created_at`

Use appropriate foreign keys, constraints, indexes, and ownership
checks. Avoid storing duplicate derived data unless there is a
documented reason.

------------------------------------------------------------------------

## 12. Initial API Outline

These routes are illustrative. Final names, response shapes, and
framework conventions must be documented in `docs/API_SPECIFICATION.md`.

  -------------------------------------------------------------------------------------
  Method                  Endpoint                              Purpose
  ----------------------- ------------------------------------- -----------------------
  `GET`                   `/api/health`                         Health check

  `GET`                   `/api/interviews`                     List current user's
                                                                interviews

  `POST`                  `/api/interviews`                     Create an interview

  `GET`                   `/api/interviews/:id`                 Read an owned interview

  `POST`                  `/api/interviews/:id/start`           Start a session

  `POST`                  `/api/interviews/:id/answers`         Submit an answer

  `POST`                  `/api/interviews/:id/next-question`   Request the next
                                                                question/follow-up

  `POST`                  `/api/interviews/:id/complete`        Complete an interview

  `GET`                   `/api/interviews/:id/report`          Retrieve the report

  `POST`                  `/api/submissions`                    Submit code for
                                                                isolated execution (P1)
  -------------------------------------------------------------------------------------

Every endpoint must define authentication, authorization, validation,
status codes, error responses, and tests. Do not assume that obscuring
an ID is sufficient authorization.

------------------------------------------------------------------------

## 13. User Interface Requirements

### Main screens

1.  Landing page
2.  Sign-up and sign-in
3.  Dashboard
4.  Interview configuration
5.  Interview room
6.  Coding question workspace (P1)
7.  Results report
8.  Interview history
9.  Settings and privacy information

### Interview room

The interview room should show: - Current question - Topic and
difficulty - Answer input - Submit/continue controls - Progress
indicator - Remaining time if a timer is enabled - Loading and error
feedback

Coding mode may use a split layout with the prompt on one side and the
editor/test results on the other.

Voice mode should be a later enhancement and should retain a text
fallback.

------------------------------------------------------------------------

## 14. Testing and Acceptance Criteria

### Authentication

-   Valid users can sign in.
-   Unauthenticated requests cannot access protected data.
-   A user cannot read or modify another user's interview by changing an
    ID.
-   Secrets are absent from client bundles and committed files.

### Interview creation

-   Valid configurations create an interview.
-   Invalid configurations are rejected.
-   AI output is schema-validated.
-   Provider failure produces a recoverable error.
-   Repeated requests do not accidentally create duplicate sessions
    where idempotency is required.

### Interview session

-   Answers are saved and associated with the correct question.
-   Session status transitions are valid.
-   Refreshing does not silently discard persisted answers.
-   Completed interviews cannot be modified through unauthorized or
    invalid transitions.

### Evaluation

-   Reports reference the correct interview.
-   Missing or malformed evaluation output is handled.
-   The report distinguishes code-test results from AI judgments.
-   Rubric changes are documented.

### Code execution

-   Code runs only through the isolated execution boundary.
-   Timeouts and failed runs are represented clearly.
-   Resource limits and provider constraints are applied where
    supported.
-   Hidden test cases and secrets are not returned to the client.

### Overall

-   Critical paths have automated tests.
-   Lint/type checks pass where configured.
-   Documentation reflects the implementation.
-   Known limitations are explicit.
-   Manual verification steps are recorded when automation is not
    feasible.

------------------------------------------------------------------------

## 15. Development Milestones

### Milestone 0: Discovery and planning

Deliverables: - Workspace inspection - MVP scope - Architecture
proposal - Initial decision log - Documentation structure - Risk and
cost assessment

**Gate:** Obtain approval before major implementation.

### Milestone 1: Foundation

Deliverables: - Application shell - Health endpoint - TypeScript and
lint/test setup - Environment configuration - Initial documentation

### Milestone 2: Auth and data

Deliverables: - Authentication - Database migrations - Interview
persistence - Ownership checks - Tests

### Milestone 3: Text interview MVP

Deliverables: - Interview configuration - AI question generation - Text
answers - Session state - Basic results report

### Milestone 4: Reliability and quality

Deliverables: - Error handling - AI schema validation - Regression
tests - Better session recovery - Improved reporting

### Milestone 5: Coding challenges

Deliverables: - Monaco Editor - Isolated execution integration - Test
results - Submission persistence

### Milestone 6: Advanced intelligence

Deliverables, chosen based on value: - Adaptive difficulty - Improved
evaluation - RAG and semantic retrieval

### Milestone 7: Voice

Deliverables: - Speech input - Spoken responses - Permissions and
fallbacks - Voice-specific error handling

### Milestone 8: Deployment and review

Deliverables: - Deployment - Security review - Cost and latency
assessment - Regression testing - Portfolio README - Interview
preparation guide - Honest limitations statement

Each milestone requires a demo, test results, updated documentation, and
a learning checkpoint.

------------------------------------------------------------------------

## 16. Documentation and Learning Requirements

Maintain these documents in `docs/` throughout development:

-   `PROJECT_VISION.md`
-   `LEARNING_ROADMAP.md`
-   `SYSTEM_ARCHITECTURE.md`
-   `DECISION_LOG.md`
-   `IMPLEMENTATION_LOG.md`
-   `DEBUGGING_LOG.md`
-   `API_SPECIFICATION.md`
-   `DATABASE_DESIGN.md`
-   `TESTING_STRATEGY.md`
-   `SECURITY.md`
-   `AI_ENGINEERING.md`
-   `INTERVIEW_PREPARATION.md`
-   `GLOSSARY.md`
-   `KNOWN_LIMITATIONS.md`
-   `RELEASE_NOTES.md`

For each significant feature, explain: 1. The problem being solved 2.
Concepts required 3. Alternatives considered 4. Decision and rationale
5. Files changed 6. Data flow 7. Tests and actual results 8. Bugs
encountered and root causes 9. Security and performance implications 10.
Questions likely to be asked in interviews

Do not invent historical decisions, bugs, measurements, or test results.
Clearly label assumptions and unverified claims.

------------------------------------------------------------------------

## 17. Risks and Mitigations

  -----------------------------------------------------------------------
  Risk                                Mitigation
  ----------------------------------- -----------------------------------
  AI produces incorrect or            Structured output, validation,
  inconsistent questions              rubrics, tests, and clear
                                      limitations

  Free-tier limits are exceeded       Usage tracking, bounded requests,
                                      graceful errors, and cost review

  Candidate code compromises          Isolated runner, resource limits,
  infrastructure                      and no execution in the app server

  Scope becomes too large             Strict MVP and milestone gates

  AI-generated code is not understood Explain-before-implement workflow
                                      and comprehension checkpoints

  Documentation becomes stale         Update docs in the same task as
                                      code

  Scores appear more objective than   Explain rubric, evidence, and
  they are                            evaluation uncertainty

  Secrets leak                        Server-side secrets, safe logging,
                                      and repository checks

  Architecture is overcomplicated     Modular monolith and evidence-based
                                      introduction of infrastructure
  -----------------------------------------------------------------------

------------------------------------------------------------------------

## 18. Definition of Done

A feature is complete only when: - Its acceptance criteria are met. -
Code is integrated and reviewed. - Relevant tests have actually been
run. - Important errors and edge cases are handled. - Security
implications are reviewed. - Documentation is updated. - Known
limitations are recorded. - The developer can explain the feature and
its tradeoffs.

A feature can be marked partially complete if a dependency or limitation
prevents completion, but the remaining work must be explicit.

------------------------------------------------------------------------

## 19. Instructions for the AI Coding Agent

Begin with discovery and planning. Inspect the existing workspace before
changing it.

Do not implement the entire application in one shot.

Present the MVP scope, proposed stack, architecture, database outline,
risks, cost considerations, documentation plan, and first milestone.
Explain the important choices and alternatives.

Create only initial planning documents during the first phase. Wait for
approval before major implementation.

For each subsequent feature, explain the approach, implement a small
increment, run relevant tests, document the real decisions and problems,
and teach the developer how the feature works.

The goal is both a working product and a developer who can confidently
explain and maintain it.

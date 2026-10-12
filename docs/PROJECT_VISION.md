# Project Vision: AI Coding Interview Platform

## Problem Statement
Candidates often lack access to consistent interview practice and useful feedback. Static question lists do not simulate follow-up questions, coding workflows, or performance tracking. Generic chatbots produce inconsistent interviews and weak evaluations.

## Target Users
- Students preparing for internships and graduate roles.
- Junior developers preparing for technical interviews.
- Self-taught developers practicing specific technologies.

## Product Goals
- Users can create and complete a text-based interview.
- Questions are relevant to the selected role, topics, and difficulty.
- Answers and interview progress are persisted.
- The system provides a useful report after completion.
- Coding questions can eventually be executed in a safe, isolated environment.

## MVP Scope
- **User Management:** Registration and authentication.
- **Interview Setup:** Select role, difficulty, topics, and duration.
- **AI Integration:** Local LLM integration via **Ollama** for question generation, follow-ups, and evaluation.
- **Session Management:** Text-based Q&A loop with progress tracking.
- **Evaluation:** Post-interview feedback report based on rubrics.

## Non-Goals for MVP
- Voice-based interviews (Planned for future).
- Real-time multiplayer/collaborative editing.
- Executing candidate code directly on our main servers (Will use isolated sandboxing).
- RAG (Retrieval-Augmented Generation) over large codebases.

-- ==============================================================================
-- AI Coding Interview Platform - Initial Database Schema Migration
-- ==============================================================================
-- Description:
-- Creates the core relational tables for interviews, questions, answers,
-- and evaluations with foreign key constraints, cascade rules, performance
-- indexes, and Row-Level Security (RLS) policies.
-- ==============================================================================

-- 1. Enable required extension for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 2. Create Tables
-- ==============================================================================

-- 2.1 Interviews Table
CREATE TABLE IF NOT EXISTS public.interviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    experience_level TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    topics TEXT[] NOT NULL DEFAULT '{}',
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created', 'in_progress', 'completed', 'failed')),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 Questions Table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'technical' CHECK (type IN ('technical', 'behavioral', 'coding')),
    topic TEXT NOT NULL,
    prompt TEXT NOT NULL,
    difficulty TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 1,
    rubric TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 Answers Table
CREATE TABLE IF NOT EXISTS public.answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.4 Evaluations Table
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    answer_id UUID NOT NULL REFERENCES public.answers(id) ON DELETE CASCADE,
    interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    feedback TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. Indexes for Foreign Keys & Query Performance
-- ==============================================================================
-- In PostgreSQL, foreign keys do NOT automatically create indexes.
-- Indexing foreign keys prevents full table sequential scans during JOINs
-- and avoids heavy table locking during ON DELETE CASCADE operations.

CREATE INDEX IF NOT EXISTS idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX IF NOT EXISTS idx_questions_interview_id ON public.questions(interview_id);
CREATE INDEX IF NOT EXISTS idx_answers_question_id ON public.answers(question_id);
CREATE INDEX IF NOT EXISTS idx_answers_interview_id ON public.answers(interview_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_answer_id ON public.evaluations(answer_id);
CREATE INDEX IF NOT EXISTS idx_evaluations_interview_id ON public.evaluations(interview_id);

-- ==============================================================================
-- 4. Enable Row Level Security (RLS)
-- ==============================================================================
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 5. Row Level Security Policies
-- ==============================================================================
-- Note: Wrapping `(SELECT auth.uid())` evaluates the function once per query
-- rather than once per row, providing a 10x+ performance boost on large scans.

-- 5.1 Policies for `interviews`
CREATE POLICY "Users can view their own interviews"
    ON public.interviews FOR SELECT
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own interviews"
    ON public.interviews FOR INSERT
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own interviews"
    ON public.interviews FOR UPDATE
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own interviews"
    ON public.interviews FOR DELETE
    USING ((SELECT auth.uid()) = user_id);

-- 5.2 Policies for `questions`
CREATE POLICY "Users can view questions for their interviews"
    ON public.questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = questions.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert questions for their interviews"
    ON public.questions FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = questions.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update questions for their interviews"
    ON public.questions FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = questions.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can delete questions for their interviews"
    ON public.questions FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = questions.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

-- 5.3 Policies for `answers`
CREATE POLICY "Users can view answers for their interviews"
    ON public.answers FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = answers.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert answers for their interviews"
    ON public.answers FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = answers.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update answers for their interviews"
    ON public.answers FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = answers.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can delete answers for their interviews"
    ON public.answers FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = answers.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

-- 5.4 Policies for `evaluations`
CREATE POLICY "Users can view evaluations for their interviews"
    ON public.evaluations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = evaluations.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can insert evaluations for their interviews"
    ON public.evaluations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = evaluations.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can update evaluations for their interviews"
    ON public.evaluations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = evaluations.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY "Users can delete evaluations for their interviews"
    ON public.evaluations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.interviews
            WHERE interviews.id = evaluations.interview_id
              AND interviews.user_id = (SELECT auth.uid())
        )
    );

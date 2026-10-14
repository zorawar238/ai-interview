-- ==============================================================================
-- AI Coding Interview Platform - Milestone 10: Adaptive Interviews Migration
-- ==============================================================================
-- Description:
-- Adds optional 'interview_mode' column to interviews table to explicitly distinguish
-- between 'adaptive' (dynamic multi-turn difficulty calibration) and 'static'
-- (fixed pre-generated difficulty) sessions.
-- ==============================================================================

-- 1. Add interview_mode column to public.interviews if not already present
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'interviews'
          AND column_name = 'interview_mode'
    ) THEN
        ALTER TABLE public.interviews
        ADD COLUMN interview_mode TEXT NOT NULL DEFAULT 'adaptive'
        CHECK (interview_mode IN ('adaptive', 'static'));
    END IF;
END $$;

-- 2. Index interview_mode for fast analytics and filtering
CREATE INDEX IF NOT EXISTS idx_interviews_mode ON public.interviews(interview_mode);

-- 3. Comment describing adaptive calibration mechanics
COMMENT ON COLUMN public.interviews.interview_mode IS 'Specifies whether interview questions scale dynamically based on real-time candidate scores (adaptive) or remain at fixed starting difficulty (static).';

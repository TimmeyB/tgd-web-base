-- Run in Neon's SQL Editor. Additive only.

-- Testing campaigns can now run over N days instead of a single 2-hour
-- claim window. 0/NULL keeps today's normal instant behavior.
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS duration_days INTEGER NOT NULL DEFAULT 0;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS requires_daily_report BOOLEAN NOT NULL DEFAULT false;

-- Reuses the same screening_questions table for daily-report questions —
-- 'purpose' distinguishes a one-time qualifying question from a question
-- asked every day of an extended test. Existing rows default to
-- 'screening' so nothing already saved changes meaning.
ALTER TABLE screening_questions ADD COLUMN IF NOT EXISTS purpose TEXT NOT NULL DEFAULT 'screening';

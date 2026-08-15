-- Run this in Neon's SQL Editor. Additive only, safe on existing data.
--
-- Supports editing a launched campaign (reward, slots, description, form
-- link) as long as no tester has started yet (slots_filled = 0). If the
-- edit raises the total charge, we hold the requested changes here until
-- Paystack confirms the extra payment, then the webhook applies them.

ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS pending_edit JSONB;
ALTER TABLE campaigns ADD COLUMN IF NOT EXISTS pending_edit_reference TEXT;

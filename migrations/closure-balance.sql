-- Balance outstanding on a won closure — run once in the Supabase SQL Editor.
--
-- Normally final_amount minus advance_received, but stored rather than always
-- derived because the closure form lets a salesperson type the balance directly:
-- a negotiated write-off or a rounding adjustment can make the real outstanding
-- differ from the subtraction, and that intent has to survive a reload.
--
-- Rows created before this column existed have NULL, which the app reads as
-- "not overridden" and falls back to the subtraction.

ALTER TABLE closures ADD COLUMN IF NOT EXISTS balance NUMERIC;

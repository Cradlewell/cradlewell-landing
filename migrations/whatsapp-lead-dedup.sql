-- ─────────────────────────────────────────────────────────────────────────────
-- WhatsApp lead capture + de-duplication migration
-- Run ONCE in the Supabase SQL Editor. Take a backup / snapshot first.
--
-- What it does:
--   1. Adds leads.whatsapp_stage (bot funnel position).
--   2. Normalizes every lead phone to the last 10 digits (matches WhatsApp).
--   3. De-duplicates leads by phone: keeps the OLDEST row, reassigns its
--      follow-ups/quotations/closures/activity, fills its blank fields from the
--      duplicates, then deletes the duplicates.
--   4. Adds a UNIQUE index on phone so the DB itself blocks future duplicates.
--   5. Back-fills leads for people who started the WhatsApp bot but were never
--      saved (the drop-offs) from whatsapp_sessions.
-- The whole thing runs in one transaction — if any step errors, nothing commits.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. New column ---------------------------------------------------------------
ALTER TABLE leads ADD COLUMN IF NOT EXISTS whatsapp_stage TEXT;

-- 2. Normalize phones to last 10 digits ---------------------------------------
UPDATE leads
SET phone = RIGHT(regexp_replace(phone, '\D', '', 'g'), 10)
WHERE phone IS DISTINCT FROM RIGHT(regexp_replace(phone, '\D', '', 'g'), 10);

-- 3. De-duplicate by phone ----------------------------------------------------
-- Survivor = earliest created_at per phone (tie-break by id).
CREATE TEMP TABLE lead_dedup ON COMMIT DROP AS
SELECT
  id,
  phone,
  first_value(id) OVER (PARTITION BY phone ORDER BY created_at ASC, id ASC) AS survivor_id
FROM leads;

-- 3a. Reassign child rows from duplicates to their survivor
UPDATE followups     f SET lead_id = d.survivor_id FROM lead_dedup d WHERE f.lead_id = d.id AND d.id <> d.survivor_id;
UPDATE quotations    q SET lead_id = d.survivor_id FROM lead_dedup d WHERE q.lead_id = d.id AND d.id <> d.survivor_id;
UPDATE closures      c SET lead_id = d.survivor_id FROM lead_dedup d WHERE c.lead_id = d.id AND d.id <> d.survivor_id;
UPDATE activity_logs a SET lead_id = d.survivor_id FROM lead_dedup d WHERE a.lead_id = d.id AND d.id <> d.survivor_id;

-- 3b. Fill each survivor's blank fields from the most recent non-blank duplicate value.
--     "WhatsApp User" placeholder names are treated as blank so a real name wins.
WITH grp AS (
  SELECT
    d.survivor_id,
    (array_agg(NULLIF(l.name, '')            ORDER BY l.created_at DESC) FILTER (WHERE NULLIF(l.name,'') IS NOT NULL AND l.name <> 'WhatsApp User'))[1] AS name,
    (array_agg(NULLIF(l.service_required,'') ORDER BY l.created_at DESC) FILTER (WHERE NULLIF(l.service_required,'') IS NOT NULL))[1] AS service_required,
    (array_agg(NULLIF(l.baby_status,'')      ORDER BY l.created_at DESC) FILTER (WHERE NULLIF(l.baby_status,'') IS NOT NULL))[1] AS baby_status,
    (array_agg(l.hospital_name               ORDER BY l.created_at DESC) FILTER (WHERE l.hospital_name IS NOT NULL))[1] AS hospital_name,
    (array_agg(l.baby_birth_stage_status     ORDER BY l.created_at DESC) FILTER (WHERE l.baby_birth_stage_status IS NOT NULL))[1] AS baby_birth_stage_status,
    (array_agg(l.baby_age                    ORDER BY l.created_at DESC) FILTER (WHERE l.baby_age IS NOT NULL))[1] AS baby_age,
    (array_agg(l.current_weight              ORDER BY l.created_at DESC) FILTER (WHERE l.current_weight IS NOT NULL))[1] AS current_weight,
    (array_agg(l.address                     ORDER BY l.created_at DESC) FILTER (WHERE l.address IS NOT NULL))[1] AS address,
    (array_agg(l.preferred_shift             ORDER BY l.created_at DESC) FILTER (WHERE l.preferred_shift IS NOT NULL))[1] AS preferred_shift,
    (array_agg(l.shift_hours_count           ORDER BY l.created_at DESC) FILTER (WHERE l.shift_hours_count IS NOT NULL))[1] AS shift_hours_count,
    (array_agg(l.shift_time                  ORDER BY l.created_at DESC) FILTER (WHERE l.shift_time IS NOT NULL))[1] AS shift_time,
    (array_agg(l.care_start_date             ORDER BY l.created_at DESC) FILTER (WHERE l.care_start_date IS NOT NULL))[1] AS care_start_date,
    (array_agg(l.service_days                ORDER BY l.created_at DESC) FILTER (WHERE l.service_days IS NOT NULL))[1] AS service_days,
    (array_agg(l.whatsapp_stage              ORDER BY l.created_at DESC) FILTER (WHERE l.whatsapp_stage IS NOT NULL))[1] AS whatsapp_stage
  FROM leads l
  JOIN lead_dedup d ON l.id = d.id
  GROUP BY d.survivor_id
)
UPDATE leads s SET
  name                    = COALESCE(NULLIF(s.name,''), g.name, s.name),
  service_required        = COALESCE(NULLIF(s.service_required,''), g.service_required, s.service_required),
  baby_status             = COALESCE(NULLIF(s.baby_status,''), g.baby_status, s.baby_status),
  hospital_name           = COALESCE(s.hospital_name, g.hospital_name),
  baby_birth_stage_status = COALESCE(s.baby_birth_stage_status, g.baby_birth_stage_status),
  baby_age                = COALESCE(s.baby_age, g.baby_age),
  current_weight          = COALESCE(s.current_weight, g.current_weight),
  address                 = COALESCE(s.address, g.address),
  preferred_shift         = COALESCE(s.preferred_shift, g.preferred_shift),
  shift_hours_count       = COALESCE(s.shift_hours_count, g.shift_hours_count),
  shift_time              = COALESCE(s.shift_time, g.shift_time),
  care_start_date         = COALESCE(s.care_start_date, g.care_start_date),
  service_days            = COALESCE(s.service_days, g.service_days),
  whatsapp_stage          = COALESCE(s.whatsapp_stage, g.whatsapp_stage)
FROM grp g
WHERE s.id = g.survivor_id;

-- 3c. Delete the duplicates (survivor kept)
DELETE FROM leads l USING lead_dedup d WHERE l.id = d.id AND d.id <> d.survivor_id;

-- 4. Enforce one-lead-per-number at the DB level ------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_unique ON leads (phone);

-- 5. Back-fill drop-off leads from active WhatsApp sessions --------------------
--    Anyone who has a bot session but no lead row (captured before the fix).
INSERT INTO leads (
  id, name, phone, whatsapp, source, lead_date, service_required, baby_status,
  address, hospital_name, baby_birth_stage_status, baby_age, current_weight,
  care_start_date, preferred_shift, shift_hours_count, shift_time, service_days,
  owner, stage, temperature, whatsapp_stage, last_activity_at, created_at
)
SELECT
  gen_random_uuid()::text,
  COALESCE(NULLIF(s.name, ''), 'WhatsApp User'),
  RIGHT(regexp_replace(s.wa_phone, '\D', '', 'g'), 10),
  RIGHT(regexp_replace(s.wa_phone, '\D', '', 'g'), 10),
  'WhatsApp',
  COALESCE(s.created_at, NOW()),
  COALESCE(s.service, ''),
  COALESCE(s.baby_status, ''),
  s.location,
  s.hospital,
  s.birth_stage,
  s.baby_age,
  s.baby_weight,
  CASE
    WHEN s.baby_status = 'Born' THEN s.care_start_date
    WHEN s.due_date ~ '^\d{4}-\d{2}-\d{2}$' THEN s.due_date
    ELSE NULL
  END,
  s.shift,
  CASE
    WHEN s.japa_hours ~ '^\d+$' THEN s.japa_hours::int
    WHEN s.shift = 'Night' THEN 9
    WHEN s.shift = 'Day' THEN 8
    ELSE NULL
  END,
  s.time_slot,
  CASE WHEN s.service_days ~ '^\d+$' THEN s.service_days::int ELSE NULL END,
  'Unassigned',
  'New Lead',
  'Cold',
  s.step,
  COALESCE(s.updated_at, NOW()),
  COALESCE(s.created_at, NOW())
FROM whatsapp_sessions s
WHERE RIGHT(regexp_replace(s.wa_phone, '\D', '', 'g'), 10) ~ '^\d{10}$'
  AND NOT EXISTS (
    SELECT 1 FROM leads l
    WHERE l.phone = RIGHT(regexp_replace(s.wa_phone, '\D', '', 'g'), 10)
  );

COMMIT;

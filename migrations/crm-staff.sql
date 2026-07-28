-- CRM staff roster — run once in the Supabase SQL Editor.
--
-- Deliberately separate from ops_staff. The Nearby Staff tab is a sales tool:
-- a salesperson adding someone here is recording a care worker's home location
-- to gauge travel distance to a lead, not adding them to the operations roster
-- where they can be scheduled onto customers. Sharing one table would mean
-- every sales entry showed up on the ops board, and removing a stale entry from
-- the CRM would delete a live ops staff member.

CREATE TABLE IF NOT EXISTS crm_staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  home_lat DOUBLE PRECISION,
  home_lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE crm_staff DISABLE ROW LEVEL SECURITY;
GRANT ALL ON crm_staff TO anon, authenticated;

-- Optional: seed the CRM roster from staff who already have coordinates on the
-- ops board. Copies values only — the two tables stay independent afterwards.
--
-- INSERT INTO crm_staff (id, name, home_lat, home_lng)
-- SELECT gen_random_uuid()::text, name, home_lat, home_lng
-- FROM ops_staff
-- WHERE home_lat IS NOT NULL AND home_lng IS NOT NULL;

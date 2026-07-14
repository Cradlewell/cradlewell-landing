-- Cradlewell CRM — run this once in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  whatsapp TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'Website',
  lead_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  service_required TEXT NOT NULL DEFAULT '',
  baby_status TEXT NOT NULL DEFAULT '',
  hospital_name TEXT,
  baby_age_or_month TEXT,
  area TEXT,
  city TEXT,
  preferred_shift TEXT,
  budget NUMERIC,
  notes TEXT,
  owner TEXT NOT NULL DEFAULT 'Unassigned',
  stage TEXT NOT NULL DEFAULT 'New Lead',
  temperature TEXT NOT NULL DEFAULT 'Cold',
  closure_probability INTEGER,
  call_notes TEXT,
  whatsapp_notes TEXT,
  last_activity_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  baby_birth_stage_status TEXT,
  baby_age TEXT,
  current_weight TEXT,
  address TEXT,
  shift_hours_count INTEGER,
  shift_time TEXT,
  care_start_date TEXT,
  service_days INTEGER,
  whatsapp_stage TEXT
);
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
-- One lead per phone number (phones are normalized to last 10 digits in app code)
CREATE UNIQUE INDEX IF NOT EXISTS leads_phone_unique ON leads (phone);

CREATE TABLE IF NOT EXISTS followups (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  due_at TIMESTAMPTZ NOT NULL,
  note TEXT DEFAULT '',
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE followups DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS quotations (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  package TEXT NOT NULL,
  shift_hours TEXT DEFAULT '',
  quoted_price NUMERIC NOT NULL DEFAULT 0,
  discount NUMERIC DEFAULT 0,
  final_price NUMERIC NOT NULL DEFAULT 0,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT DEFAULT ''
);
ALTER TABLE quotations DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS closures (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  final_package TEXT,
  final_amount NUMERIC,
  advance_received NUMERIC,
  payment_status TEXT,
  closure_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sales_owner TEXT,
  lost_reason TEXT,
  competitor_name TEXT,
  notes TEXT
);
ALTER TABLE closures DISABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  lead_id TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  message TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE activity_logs DISABLE ROW LEVEL SECURITY;

GRANT ALL ON leads TO anon, authenticated;
GRANT ALL ON followups TO anon, authenticated;
GRANT ALL ON quotations TO anon, authenticated;
GRANT ALL ON closures TO anon, authenticated;
GRANT ALL ON activity_logs TO anon, authenticated;

-- ── WhatsApp bot ─────────────────────────────────────────────────────────────
-- WhatsApp sessions table
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY,
  wa_phone TEXT UNIQUE NOT NULL,
  step TEXT NOT NULL DEFAULT 'greeting',
  name TEXT,
  service TEXT,
  baby_status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id UUID PRIMARY KEY,
  wa_phone TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- WhatsApp events table (for Meta webhook events like account_update)
CREATE TABLE IF NOT EXISTS whatsapp_events (
  id UUID PRIMARY KEY,
  event_type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone ON whatsapp_messages(wa_phone);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone ON whatsapp_sessions(wa_phone);

-- Session columns (added incrementally as the bot flow grew)
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS due_date TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS shift TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS time_slot TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS hospital TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS baby_weight TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS japa_hours TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS birth_stage TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS baby_age TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS service_days TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS care_start_date TEXT;
ALTER TABLE whatsapp_sessions ADD COLUMN IF NOT EXISTS agent_active BOOLEAN DEFAULT FALSE;

-- Message deduplication column
ALTER TABLE whatsapp_messages ADD COLUMN IF NOT EXISTS wa_message_id TEXT UNIQUE;

-- WhatsApp conversation sessions (one row per contact)
create table if not exists whatsapp_sessions (
  id uuid primary key,
  wa_phone text unique not null,
  step text not null default 'greeting',
  name text,
  service text,
  baby_status text,
  location text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- WhatsApp message history
create table if not exists whatsapp_messages (
  id uuid primary key,
  wa_phone text not null,
  direction text not null check (direction in ('inbound', 'outbound')),
  message text not null,
  created_at timestamptz default now()
);

create index if not exists idx_whatsapp_messages_phone on whatsapp_messages(wa_phone);
create index if not exists idx_whatsapp_sessions_phone on whatsapp_sessions(wa_phone);

-- Run this if table already exists (adds location column)
alter table whatsapp_sessions add column if not exists location text;

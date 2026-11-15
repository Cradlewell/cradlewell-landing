-- New CRM (v2) — additive schema. ALREADY APPLIED to the Cradlewell project (16 Nov 2026).
-- Nothing existing is changed or removed.
alter table public.leads add column if not exists meta jsonb not null default '{}'::jsonb;
alter table public.leads add column if not exists legacy_stage text;
alter table public.followups add column if not exists meta jsonb not null default '{}'::jsonb;

create table if not exists public.crm_consults (
  id text primary key,
  lead_id text references public.leads(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
create index if not exists crm_consults_lead_idx on public.crm_consults(lead_id);

create table if not exists public.crm_timelines (
  lead_id text primary key references public.leads(id) on delete cascade,
  events jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.crm_settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.crm_consults enable row level security;
alter table public.crm_timelines enable row level security;
alter table public.crm_settings enable row level security;

-- Stable customer numbers (CW-P-0001 / CW-B-0001).
-- Before this, the number was the lead's rank by created_at, so deleting a lead renumbered everyone after it.
-- Now each lead keeps the number it has today, and new leads (website, WhatsApp, CRM) get the next one from a sequence.

create sequence if not exists public.leads_customer_no_seq;

alter table public.leads add column if not exists customer_no integer;

-- Freeze today's numbers: same ordering the CRM used to compute them (created_at, then id)
with r as (
  select id, row_number() over (order by created_at, id) as n
  from public.leads
)
update public.leads l set customer_no = r.n
from r
where l.id = r.id and l.customer_no is null;

select setval('public.leads_customer_no_seq', greatest((select coalesce(max(customer_no), 0) from public.leads), 1));

alter table public.leads alter column customer_no set default nextval('public.leads_customer_no_seq');
alter sequence public.leads_customer_no_seq owned by public.leads.customer_no;
alter table public.leads alter column customer_no set not null;
create unique index if not exists leads_customer_no_key on public.leads (customer_no);

-- Undo:
-- drop index if exists public.leads_customer_no_key;
-- alter table public.leads drop column if exists customer_no;  -- also drops the owned sequence

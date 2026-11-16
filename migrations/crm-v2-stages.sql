-- New CRM (v2) — move leads from the old 12 stages to the new 8.
-- Applied on 16 Nov 2026 after the go-live deploy (a1cb69f). The new CRM already reads the old names correctly,
-- so there is no rush. Reversible: the old stage is kept in legacy_stage.
--
--   Undo:  update leads set stage = legacy_stage where legacy_stage is not null;
--          alter table leads alter column stage set default 'New Lead';

begin;

update public.leads set legacy_stage = stage where legacy_stage is null;

-- Operations' Requirements tab used the "Nurse Required" / "Moba Required" stages. Keep that flag on the lead
-- (meta.opsRequirement) before those stages become "Qualified". /api/ops/requirements reads it.
update public.leads
  set meta = coalesce(meta, '{}'::jsonb) || jsonb_build_object('opsRequirement', case stage when 'Nurse Required' then 'Nurse' else 'Moba' end)
  where stage in ('Nurse Required', 'Moba Required') and not (coalesce(meta, '{}'::jsonb) ? 'opsRequirement');

update public.leads set stage = case stage
    when 'New Lead'          then 'New'
    when 'Contacted'         then 'Qualified'
    when 'Nurse Required'    then 'Qualified'
    when 'Moba Required'     then 'Qualified'
    when 'Due date soon'     then 'Qualified'
    when 'Follow-up'         then 'Qualified'
    when 'Not Responding'    then 'Qualified'
    when 'Negotiation'       then 'Consult done'
    when 'Deferred Hot Lead' then 'Deferred'
    when 'Closed Won'        then 'Won'
    when 'Closed Lost'       then 'Lost'
    when 'Invalid Lead'      then 'Lost'
    else stage end
where stage in ('New Lead','Contacted','Nurse Required','Moba Required','Due date soon','Follow-up',
                'Not Responding','Negotiation','Deferred Hot Lead','Closed Won','Closed Lost','Invalid Lead');

-- Keep the meaning of the two stages that become a tag / reason
update public.leads set meta = coalesce(meta, '{}'::jsonb) || '{"tag":"Not responding"}'::jsonb
  where legacy_stage = 'Not Responding' and not (coalesce(meta, '{}'::jsonb) ? 'tag');
-- Only where no Lost reason was recorded on a closure (that one is more specific)
update public.leads l set meta = coalesce(l.meta, '{}'::jsonb) || '{"lostReason":"Invalid lead"}'::jsonb
  where l.legacy_stage = 'Invalid Lead' and not (coalesce(l.meta, '{}'::jsonb) ? 'lostReason')
    and not exists (select 1 from public.closures c where c.lead_id = l.id and c.type = 'Lost' and c.lost_reason is not null);

-- Leads created by the website form / WhatsApp default to the new first stage
alter table public.leads alter column stage set default 'New';

commit;

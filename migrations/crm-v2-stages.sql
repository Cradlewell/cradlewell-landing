-- New CRM (v2) — move leads from the old 12 stages to the new 8.
-- NOT YET APPLIED. Run it once the new CRM is deployed (the old CRM does not
-- know the new stage names). The new CRM already reads the old names correctly,
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
update public.leads set meta = meta || '{"tag":"Not responding"}'::jsonb
  where legacy_stage = 'Not Responding' and not (meta ? 'tag');
update public.leads set meta = meta || '{"lostReason":"Invalid lead"}'::jsonb
  where legacy_stage = 'Invalid Lead' and not (meta ? 'lostReason');

-- Leads created by the website form / WhatsApp default to the new first stage
alter table public.leads alter column stage set default 'New';

commit;

import { createClient } from "@supabase/supabase-js";
import type { Lead, Followup, Quotation, Closure, ActivityLog } from "./crm-types";

export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// ─── DB row → TypeScript type mappers ────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToLead(r: Record<string, any>): Lead {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone,
    whatsapp: r.whatsapp ?? "",
    source: r.source,
    leadDate: r.lead_date,
    serviceRequired: r.service_required,
    babyStatus: r.baby_status,
    hospitalName: r.hospital_name ?? undefined,
    babyAgeOrMonth: r.baby_age_or_month ?? undefined,
    area: r.area ?? undefined,
    city: r.city ?? undefined,
    preferredShift: r.preferred_shift ?? undefined,
    budget: r.budget ?? undefined,
    notes: r.notes ?? undefined,
    owner: r.owner,
    stage: r.stage,
    temperature: r.temperature,
    closureProbability: r.closure_probability ?? undefined,
    callNotes: r.call_notes ?? undefined,
    whatsappNotes: r.whatsapp_notes ?? undefined,
    lastActivityAt: r.last_activity_at,
    createdAt: r.created_at,
    babyBirthStageStatus: r.baby_birth_stage_status ?? undefined,
    babyAge: r.baby_age ?? undefined,
    currentWeight: r.current_weight ?? undefined,
    address: r.address ?? undefined,
    shiftHoursCount: r.shift_hours_count ?? undefined,
    shiftTime: r.shift_time ?? undefined,
    careStartDate: r.care_start_date ?? undefined,
    serviceDays: r.service_days ?? undefined,
  };
}

export function leadToDb(l: Partial<Lead>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (l.id !== undefined) r.id = l.id;
  if (l.name !== undefined) r.name = l.name;
  if (l.phone !== undefined) r.phone = l.phone;
  if (l.whatsapp !== undefined) r.whatsapp = l.whatsapp;
  if (l.source !== undefined) r.source = l.source;
  if (l.leadDate !== undefined) r.lead_date = l.leadDate;
  if (l.serviceRequired !== undefined) r.service_required = l.serviceRequired;
  if (l.babyStatus !== undefined) r.baby_status = l.babyStatus;
  if (l.hospitalName !== undefined) r.hospital_name = l.hospitalName;
  if (l.babyAgeOrMonth !== undefined) r.baby_age_or_month = l.babyAgeOrMonth;
  if (l.area !== undefined) r.area = l.area;
  if (l.city !== undefined) r.city = l.city;
  if (l.preferredShift !== undefined) r.preferred_shift = l.preferredShift;
  if (l.budget !== undefined) r.budget = l.budget;
  if (l.notes !== undefined) r.notes = l.notes;
  if (l.owner !== undefined) r.owner = l.owner;
  if (l.stage !== undefined) r.stage = l.stage;
  if (l.temperature !== undefined) r.temperature = l.temperature;
  if (l.closureProbability !== undefined) r.closure_probability = l.closureProbability;
  if (l.callNotes !== undefined) r.call_notes = l.callNotes;
  if (l.whatsappNotes !== undefined) r.whatsapp_notes = l.whatsappNotes;
  if (l.lastActivityAt !== undefined) r.last_activity_at = l.lastActivityAt;
  if (l.createdAt !== undefined) r.created_at = l.createdAt;
  if (l.babyBirthStageStatus !== undefined) r.baby_birth_stage_status = l.babyBirthStageStatus;
  if (l.babyAge !== undefined) r.baby_age = l.babyAge;
  if (l.currentWeight !== undefined) r.current_weight = l.currentWeight;
  if (l.address !== undefined) r.address = l.address;
  if (l.shiftHoursCount !== undefined) r.shift_hours_count = l.shiftHoursCount;
  if (l.shiftTime !== undefined) r.shift_time = l.shiftTime;
  if (l.careStartDate !== undefined) r.care_start_date = l.careStartDate;
  if (l.serviceDays !== undefined) r.service_days = l.serviceDays;
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToFollowup(r: Record<string, any>): Followup {
  return {
    id: r.id,
    leadId: r.lead_id,
    type: r.type,
    dueAt: r.due_at,
    note: r.note ?? "",
    completed: r.completed,
    completedAt: r.completed_at ?? undefined,
    createdAt: r.created_at,
  };
}

export function followupToDb(f: Partial<Followup>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (f.id !== undefined) r.id = f.id;
  if (f.leadId !== undefined) r.lead_id = f.leadId;
  if (f.type !== undefined) r.type = f.type;
  if (f.dueAt !== undefined) r.due_at = f.dueAt;
  if (f.note !== undefined) r.note = f.note;
  if (f.completed !== undefined) r.completed = f.completed;
  if (f.completedAt !== undefined) r.completed_at = f.completedAt;
  if (f.createdAt !== undefined) r.created_at = f.createdAt;
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToQuotation(r: Record<string, any>): Quotation {
  return {
    id: r.id,
    leadId: r.lead_id,
    package: r.package,
    shiftHours: r.shift_hours ?? "",
    quotedPrice: r.quoted_price,
    discount: r.discount ?? 0,
    finalPrice: r.final_price,
    date: r.date,
    notes: r.notes ?? "",
  };
}

export function quotationToDb(q: Partial<Quotation>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (q.id !== undefined) r.id = q.id;
  if (q.leadId !== undefined) r.lead_id = q.leadId;
  if (q.package !== undefined) r.package = q.package;
  if (q.shiftHours !== undefined) r.shift_hours = q.shiftHours;
  if (q.quotedPrice !== undefined) r.quoted_price = q.quotedPrice;
  if (q.discount !== undefined) r.discount = q.discount;
  if (q.finalPrice !== undefined) r.final_price = q.finalPrice;
  if (q.date !== undefined) r.date = q.date;
  if (q.notes !== undefined) r.notes = q.notes;
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToClosure(r: Record<string, any>): Closure {
  return {
    id: r.id,
    leadId: r.lead_id,
    type: r.type,
    finalPackage: r.final_package ?? undefined,
    finalAmount: r.final_amount ?? undefined,
    advanceReceived: r.advance_received ?? undefined,
    paymentStatus: r.payment_status ?? undefined,
    closureDate: r.closure_date,
    salesOwner: r.sales_owner ?? undefined,
    lostReason: r.lost_reason ?? undefined,
    competitorName: r.competitor_name ?? undefined,
    notes: r.notes ?? undefined,
  };
}

export function closureToDb(c: Partial<Closure>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (c.id !== undefined) r.id = c.id;
  if (c.leadId !== undefined) r.lead_id = c.leadId;
  if (c.type !== undefined) r.type = c.type;
  if (c.finalPackage !== undefined) r.final_package = c.finalPackage;
  if (c.finalAmount !== undefined) r.final_amount = c.finalAmount;
  if (c.advanceReceived !== undefined) r.advance_received = c.advanceReceived;
  if (c.paymentStatus !== undefined) r.payment_status = c.paymentStatus;
  if (c.closureDate !== undefined) r.closure_date = c.closureDate;
  if (c.salesOwner !== undefined) r.sales_owner = c.salesOwner;
  if (c.lostReason !== undefined) r.lost_reason = c.lostReason;
  if (c.competitorName !== undefined) r.competitor_name = c.competitorName;
  if (c.notes !== undefined) r.notes = c.notes;
  return r;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function dbToActivity(r: Record<string, any>): ActivityLog {
  return {
    id: r.id,
    leadId: r.lead_id,
    type: r.type,
    message: r.message,
    at: r.at,
  };
}

export function activityToDb(a: Partial<ActivityLog>): Record<string, unknown> {
  const r: Record<string, unknown> = {};
  if (a.id !== undefined) r.id = a.id;
  if (a.leadId !== undefined) r.lead_id = a.leadId;
  if (a.type !== undefined) r.type = a.type;
  if (a.message !== undefined) r.message = a.message;
  if (a.at !== undefined) r.at = a.at;
  return r;
}

export async function isAuthed(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const { error } = await supabase.auth.getUser(token);
  return !error;
}

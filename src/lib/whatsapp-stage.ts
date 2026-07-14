// Human-friendly labels for the WhatsApp bot funnel step stored on a lead
// (leads.whatsapp_stage). The raw step values come from the bot state machine in
// src/app/api/whatsapp/route.ts. Kept in one place so the Leads table, Pipeline
// cards, and anywhere else render the same wording.

const WA_STAGE_LABELS: Record<string, string> = {
  greeting: "Just started",
  ask_name: "Getting name",
  ask_baby_status: "Baby status",
  ask_location: "Location",
  ask_hospital: "Hospital",
  ask_birth_stage: "Birth stage",
  ask_baby_age: "Baby age",
  ask_baby_weight: "Baby weight",
  ask_due_date: "Due date",
  ask_care_date: "Care start date",
  ask_service: "Service",
  ask_shift: "Shift",
  ask_japa_hours: "Care hours",
  ask_time_slot: "Time slot",
  ask_service_days: "Support days",
  completed: "Completed",
  opted_out: "Opted out",
  agent_handoff: "Agent handoff",
  confirm_resubscribe: "Re-subscribe?",
};

export function waStageLabel(step?: string | null): string {
  if (!step) return "";
  return WA_STAGE_LABELS[step] ?? step.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// Badge palette by broad status. `neutral` is the default (mid-funnel).
export function waStageTone(step?: string | null): "done" | "stopped" | "neutral" {
  if (step === "completed") return "done";
  if (step === "opted_out") return "stopped";
  return "neutral";
}

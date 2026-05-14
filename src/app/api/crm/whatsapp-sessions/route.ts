import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

// Sessions that should NOT appear as importable leads
const DONE_STEPS = ["completed", "opted_out", "agent_handoff"];

export async function GET() {
  const { data, error } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .not("step", "in", `(${DONE_STEPS.join(",")})`)
    .order("updated_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Filter out any sessions with no name AND no service (truly blank sessions)
  const sessions = (data ?? []).filter(
    (s) => s.name || s.service || s.baby_status
  );

  // Also check which phones already have a lead
  if (!sessions.length) return NextResponse.json({ sessions: [] });

  const phones = sessions.map((s: { wa_phone: string }) =>
    s.wa_phone.replace(/\D/g, "").slice(-10)
  );
  const { data: existingLeads } = await supabase
    .from("leads")
    .select("phone")
    .in("phone", phones);

  const existingPhones = new Set((existingLeads ?? []).map((l: { phone: string }) => l.phone));

  return NextResponse.json({
    sessions: sessions.map((s: Record<string, unknown>) => ({
      ...s,
      already_imported: existingPhones.has(
        String(s.wa_phone).replace(/\D/g, "").slice(-10)
      ),
    })),
  });
}

export async function POST(req: NextRequest) {
  const { wa_phone } = await req.json();

  const { data: session, error: sessionError } = await supabase
    .from("whatsapp_sessions")
    .select("*")
    .eq("wa_phone", wa_phone)
    .single();

  if (sessionError || !session)
    return NextResponse.json({ error: "Session not found" }, { status: 404 });

  const phone = String(wa_phone).replace(/\D/g, "").slice(-10);

  const { data: existing } = await supabase
    .from("leads")
    .select("id")
    .eq("phone", phone)
    .maybeSingle();

  if (existing)
    return NextResponse.json({ error: "Lead already exists for this number" }, { status: 409 });

  // Derive shift hours
  let shiftHoursCount: number | null = null;
  if (session.japa_hours) shiftHoursCount = parseInt(session.japa_hours) || null;
  else if (session.shift === "Night") shiftHoursCount = 9;
  else if (session.shift === "Day") shiftHoursCount = 8;

  // Care start date (born = explicit date; expecting = due date)
  let careStartDate: string | null = session.care_start_date || null;
  if (!careStartDate && session.baby_status === "Expecting" && session.due_date) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(session.due_date)) careStartDate = session.due_date;
  }

  const now = new Date().toISOString();

  const { error } = await supabase.from("leads").insert({
    id: crypto.randomUUID(),
    name: session.name || "WhatsApp User",
    phone,
    whatsapp: phone,
    source: "WhatsApp",
    lead_date: now,
    service_required: session.service || "",
    baby_status: session.baby_status || "Unknown",
    address: session.location || null,
    hospital_name: session.hospital || null,
    baby_birth_stage_status: session.birth_stage || null,
    baby_age: session.baby_age || null,
    current_weight: session.baby_weight || null,
    care_start_date: careStartDate,
    preferred_shift: session.shift || null,
    shift_hours_count: shiftHoursCount,
    shift_time: session.time_slot || null,
    service_days: session.service_days ? parseInt(session.service_days) || null : null,
    owner: "Unassigned",
    stage: "New Lead",
    temperature: "Cold",
    last_activity_at: now,
    created_at: now,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

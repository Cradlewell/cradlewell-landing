import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

// Leads Operations needs to staff. Sales used to mark them with the "Nurse Required" / "Moba Required" stages;
// since the CRM moved to its 8 stages that flag lives in meta.opsRequirement ("Nurse" | "Moba").
// Both are read, so this works before and after migrations/crm-v2-stages.sql. Closed leads are left out.
const CLOSED = new Set(["Won", "Lost", "Deferred", "Closed Won", "Closed Lost", "Invalid Lead", "Deferred Hot Lead"]);

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, area, city, address, service_required, preferred_shift, shift_hours_count, shift_time, care_start_date, service_days, budget, notes, owner, temperature, last_activity_at, created_at, stage, baby_status, baby_age_or_month, meta")
    .or('stage.in.("Nurse Required","Moba Required"),meta->>opsRequirement.in.(Nurse,Moba)')
    .order("last_activity_at", { ascending: false });

  if (error) {
    console.error("[ops/requirements GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const rows = (data ?? [])
    .filter((r) => !CLOSED.has(r.stage))
    .map(({ meta, ...r }) => {
      const flag = (meta as Record<string, unknown> | null)?.opsRequirement;
      // The Operations board groups by these two labels
      const stage = r.stage === "Nurse Required" || r.stage === "Moba Required" ? r.stage : flag === "Nurse" ? "Nurse Required" : "Moba Required";
      return { ...r, crm_stage: r.stage, stage };
    });

  return NextResponse.json(rows);
}

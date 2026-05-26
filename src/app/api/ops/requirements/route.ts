import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const { data, error } = await supabase
    .from("leads")
    .select("id, name, phone, area, city, service_required, preferred_shift, shift_hours_count, shift_time, care_start_date, service_days, budget, notes, owner, temperature, last_activity_at, created_at, stage, baby_status, baby_age_or_month")
    .in("stage", ["Nurse Required", "Moba Required"])
    .order("last_activity_at", { ascending: false });

  if (error) {
    console.error("[ops/requirements GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

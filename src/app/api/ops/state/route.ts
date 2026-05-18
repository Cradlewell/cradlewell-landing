import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabase
    .from("ops_customer_state")
    .select("*");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { error } = await supabase
    .from("ops_customer_state")
    .upsert(
      {
        lead_id: body.lead_id,
        staff_ids: body.staff_ids ?? [],
        package_days: body.package_days ?? null,
        start_date: body.start_date ?? null,
        shift_time: body.shift_time ?? null,
        rota: body.rota ?? {},
        rota_reasons: body.rota_reasons ?? {},
        paused_dates: body.paused_dates ?? [],
        leave_dates: body.leave_dates ?? [],
        updated_at: new Date().toISOString(),
      },
      { onConflict: "lead_id" }
    );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

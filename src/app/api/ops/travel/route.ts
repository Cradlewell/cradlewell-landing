import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data, error } = await supabase
    .from("ops_travel_entries")
    .select("*")
    .order("date", { ascending: false });
  if (error) { console.error("[ops/travel GET]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { error } = await supabase.from("ops_travel_entries").insert({
    id: body.id ?? crypto.randomUUID(),
    staff_id: body.staffId,
    date: body.date,
    trip_type: body.tripType,
    from_location: body.from,
    to_location: body.to,
    distance: body.distance,
    mode: body.mode,
    amount: body.amount,
    receipt: body.receipt ?? false,
    notes: body.notes ?? null,
  });
  if (error) { console.error("[ops/travel POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabase
    .from("ops_travel_entries")
    .select("*")
    .order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { error } = await supabase.from("ops_travel_entries").insert({
    id: body.id,
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
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

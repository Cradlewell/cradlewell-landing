import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToActivity, activityToDb } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabase.from("activity_logs").select("*").order("at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(dbToActivity));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("activity_logs").insert(activityToDb(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToActivity(data));
}

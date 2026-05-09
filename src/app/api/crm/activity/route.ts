import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToActivity, activityToDb, isAuthed } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase.from("activity_logs").select("*").order("at", { ascending: false }).limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(dbToActivity));
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { data, error } = await supabase.from("activity_logs").insert(activityToDb(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToActivity(data));
}

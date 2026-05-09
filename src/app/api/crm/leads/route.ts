import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToLead, leadToDb, isAuthed } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data, error } = await supabase.from("leads").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(dbToLead));
}

export async function POST(req: NextRequest) {
  if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const body = await req.json();
  const { data, error } = await supabase.from("leads").insert(leadToDb(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToLead(data));
}

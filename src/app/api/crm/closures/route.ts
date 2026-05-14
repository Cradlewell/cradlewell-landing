import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToClosure, closureToDb, isAuthed } from "@/lib/supabase-server";

async function auth(req: NextRequest) {
  return isAuthed(req.cookies.get("crm_auth")?.value);
}

export async function GET(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabase.from("closures").select("*").order("closure_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(dbToClosure));
}

export async function POST(req: NextRequest) {
  if (!await auth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const { data, error } = await supabase.from("closures").insert(closureToDb(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToClosure(data));
}

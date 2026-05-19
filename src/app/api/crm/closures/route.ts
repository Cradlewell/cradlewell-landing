import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToClosure, closureToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data, error } = await supabase.from("closures").select("*").order("closure_date", { ascending: false });
  if (error) { console.error("[closures GET]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json((data ?? []).map(dbToClosure));
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { data, error } = await supabase.from("closures").insert(closureToDb(body)).select().single();
  if (error) { console.error("[closures POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToClosure(data));
}

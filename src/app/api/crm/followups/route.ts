import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToFollowup, followupToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data, error } = await supabase.from("followups").select("*").order("created_at", { ascending: false });
  if (error) { console.error("[followups GET]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json((data ?? []).map(dbToFollowup));
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { data, error } = await supabase.from("followups").insert(followupToDb(body)).select().single();
  if (error) { console.error("[followups POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToFollowup(data));
}

import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToActivity, activityToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data, error } = await supabase.from("activity_logs").select("*").order("at", { ascending: false }).limit(500);
  if (error) { console.error("[activity GET]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json((data ?? []).map(dbToActivity));
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { data, error } = await supabase.from("activity_logs").insert(activityToDb(body)).select().single();
  if (error) { console.error("[activity POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToActivity(data));
}

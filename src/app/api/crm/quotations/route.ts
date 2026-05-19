import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToQuotation, quotationToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data, error } = await supabase.from("quotations").select("*").order("date", { ascending: false });
  if (error) { console.error("[quotations GET]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json((data ?? []).map(dbToQuotation));
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { data, error } = await supabase.from("quotations").insert(quotationToDb(body)).select().single();
  if (error) { console.error("[quotations POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToQuotation(data));
}

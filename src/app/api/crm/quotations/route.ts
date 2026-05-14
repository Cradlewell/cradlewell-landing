import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToQuotation, quotationToDb } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabase.from("quotations").select("*").order("date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(dbToQuotation));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("quotations").insert(quotationToDb(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToQuotation(data));
}

import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToClosure, closureToDb } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabase.from("closures").select("*").order("closure_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json((data ?? []).map(dbToClosure));
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { data, error } = await supabase.from("closures").insert(closureToDb(body)).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToClosure(data));
}

import { NextRequest, NextResponse } from "next/server";
import { supabase, leadToDb, isAuthed } from "@/lib/supabase-server";
import type { Lead } from "@/lib/crm-types";

export async function POST(req: NextRequest) {
  if (!isAuthed(req.cookies.get("crm_auth")?.value)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const rows: Lead[] = await req.json();
  const { error } = await supabase.from("leads").insert(rows.map(leadToDb));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, count: rows.length });
}

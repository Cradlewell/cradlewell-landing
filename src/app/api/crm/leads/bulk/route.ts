import { NextRequest, NextResponse } from "next/server";
import { supabase, leadToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import type { Lead } from "@/lib/crm-types";

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const rows: Lead[] = await req.json();
  if (!Array.isArray(rows) || rows.length > 500) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
  const { error } = await supabase.from("leads").insert(rows.map(leadToDb));
  if (error) { console.error("[leads bulk POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json({ success: true, count: rows.length });
}

import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToLead, leadToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from("leads").update(leadToDb(body)).eq("id", id).select().single();
  if (error) { console.error("[leads PUT]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToLead(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { id } = await params;
  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) { console.error("[leads DELETE]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json({ success: true });
}

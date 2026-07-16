import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToQuotation, quotationToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase
    .from("quotations")
    .update(quotationToDb(body))
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("[quotations PUT]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToQuotation(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { id } = await params;
  const { error } = await supabase.from("quotations").delete().eq("id", id);
  if (error) { console.error("[quotations DELETE]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

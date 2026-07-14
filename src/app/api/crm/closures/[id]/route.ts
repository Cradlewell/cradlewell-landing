import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToClosure, closureToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase
    .from("closures")
    .update(closureToDb(body))
    .eq("id", id)
    .select()
    .single();
  if (error) { console.error("[closures PUT]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToClosure(data));
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { id } = await params;
  const { error } = await supabase.from("closures").delete().eq("id", id);
  if (error) { console.error("[closures DELETE]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

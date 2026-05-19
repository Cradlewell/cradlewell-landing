import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { error } = await supabase.from("ops_travel_entries").delete().eq("id", params.id);
  if (error) { console.error("[ops/travel DELETE]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

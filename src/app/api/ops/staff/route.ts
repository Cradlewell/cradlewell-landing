import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data, error } = await supabase
    .from("ops_staff")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) { console.error("[ops/staff GET]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { data, error } = await supabase
    .from("ops_staff")
    .insert({ id: crypto.randomUUID(), name: body.name, role: body.role, initials: body.initials, color: body.color })
    .select()
    .single();
  if (error) { console.error("[ops/staff POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { error } = await supabase.from("ops_staff").delete().eq("id", id);
  if (error) { console.error("[ops/staff DELETE]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json({ ok: true });
}

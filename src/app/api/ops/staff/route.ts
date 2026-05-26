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
    .insert({ id: body.id ?? crypto.randomUUID(), name: body.name, role: body.role, initials: body.initials, color: body.color, phone: body.phone ?? null, location: body.location ?? null, languages: body.languages ?? null, area: body.area ?? null, notes: body.notes ?? null })
    .select()
    .single();
  if (error) { console.error("[ops/staff POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const { data, error } = await supabase
    .from("ops_staff")
    .update({ name: body.name, role: body.role, initials: body.initials, phone: body.phone ?? null, location: body.location ?? null, languages: body.languages ?? null, area: body.area ?? null, notes: body.notes ?? null })
    .eq("id", body.id)
    .select()
    .single();
  if (error) { console.error("[ops/staff PUT]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
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

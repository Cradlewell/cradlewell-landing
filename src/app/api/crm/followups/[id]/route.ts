import { NextRequest, NextResponse } from "next/server";
import { supabase, dbToFollowup, followupToDb, isAuthed } from "@/lib/supabase-server";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAuthed(req.cookies.get("crm_auth")?.value))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const body = await req.json();
  const { data, error } = await supabase.from("followups").update(followupToDb(body)).eq("id", id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(dbToFollowup(data));
}

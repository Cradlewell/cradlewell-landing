import { NextRequest, NextResponse } from "next/server";
import { supabase, fetchAllPages, dbToLead, leadToDb } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

// Paged: an unqualified select is capped at PostgREST's 1000-row ceiling, which
// this table is already within sight of. Returning a silently short list here
// would read as leads having been deleted.
export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = await fetchAllPages<Record<string, any>>((from, to) =>
      supabase.from("leads").select("*")
        .order("created_at", { ascending: false }).order("id", { ascending: true })
        .range(from, to)
    );
    return NextResponse.json(rows.map(dbToLead));
  } catch (err) {
    console.error("[leads GET]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const body = await req.json();
  const { data, error } = await supabase.from("leads").insert(leadToDb(body)).select().single();
  if (error) { console.error("[leads POST]", error); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
  return NextResponse.json(dbToLead(data));
}

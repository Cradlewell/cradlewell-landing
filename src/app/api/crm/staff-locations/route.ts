import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

// CRM staff roster, backed by its own crm_staff table (see
// migrations/crm-staff.sql). Independent of ops_staff by design: staff a
// salesperson adds here exist only to measure distance to a lead and must not
// appear on the operations board or be schedulable onto customers.

const SELECT = "id, name, home_lat, home_lng";

// Coordinates arrive as form strings. Reject anything non-numeric or outside the
// valid range rather than storing a value that would silently skew every
// distance on the board.
function parseCoord(value: unknown, limit: number): number | null | "invalid" {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).trim());
  if (!Number.isFinite(n) || Math.abs(n) > limit) return "invalid";
  return n;
}

function readBody(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return { error: "Name is required" as const };

  const lat = parseCoord(body.home_lat, 90);
  if (lat === "invalid") return { error: "Latitude must be a number between -90 and 90" as const };
  const lng = parseCoord(body.home_lng, 180);
  if (lng === "invalid") return { error: "Longitude must be a number between -180 and 180" as const };

  // A half-set coordinate pair is unusable for distance and would read as
  // "location known" downstream, so require both or neither.
  if ((lat === null) !== (lng === null)) {
    return { error: "Enter both latitude and longitude, or leave both blank" as const };
  }

  return { name, lat, lng };
}

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data, error } = await supabase.from("crm_staff").select(SELECT).order("name", { ascending: true });
  if (error) {
    console.error("[crm/staff-locations GET]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const parsed = readBody(await req.json());
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabase
    .from("crm_staff")
    .insert({ id: crypto.randomUUID(), name: parsed.name, home_lat: parsed.lat, home_lng: parsed.lng })
    .select(SELECT)
    .single();

  if (error) {
    console.error("[crm/staff-locations POST]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const parsed = readBody(body);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const { data, error } = await supabase
    .from("crm_staff")
    .update({ name: parsed.name, home_lat: parsed.lat, home_lng: parsed.lng })
    .eq("id", body.id)
    .select(SELECT)
    .single();

  if (error) {
    console.error("[crm/staff-locations PUT]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase.from("crm_staff").delete().eq("id", id);
  if (error) {
    console.error("[crm/staff-locations DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

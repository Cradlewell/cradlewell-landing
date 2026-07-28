import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

// Staff roster CRUD scoped to what the CRM "Update staff location" dialog owns:
// name and home coordinates. Deliberately separate from /api/ops/staff, whose
// PUT rewrites the whole row (phone, area, languages, notes) and would blank
// those fields when called with the CRM form's narrower payload.

// Mirrors the avatar palette in OpsBoard so staff added here look the same on
// the ops board as staff added there.
const PALETTE = [
  "#5F47FF", "#4A35E0", "#22c55e", "#f59e0b", "#a855f7",
  "#ec4899", "#06b6d4", "#f43f5e", "#84cc16", "#eab308",
];

const SELECT = "id, name, role, area, home_lat, home_lng";

function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

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
  const { data, error } = await supabase.from("ops_staff").select(SELECT).order("name", { ascending: true });
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

  // Colour by current roster size so avatars stay spread across the palette.
  const { count } = await supabase.from("ops_staff").select("id", { count: "exact", head: true });

  const { data, error } = await supabase
    .from("ops_staff")
    .insert({
      id: crypto.randomUUID(),
      name: parsed.name,
      role: "Nurse",
      initials: initialsOf(parsed.name),
      color: PALETTE[(count ?? 0) % PALETTE.length],
      home_lat: parsed.lat,
      home_lng: parsed.lng,
    })
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

  // Only the three fields this dialog owns. Phone, area, languages, notes, role
  // and colour belong to the ops roster and must survive an edit made here.
  const { data, error } = await supabase
    .from("ops_staff")
    .update({ name: parsed.name, initials: initialsOf(parsed.name), home_lat: parsed.lat, home_lng: parsed.lng })
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

  const { error } = await supabase.from("ops_staff").delete().eq("id", id);
  if (error) {
    console.error("[crm/staff-locations DELETE]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

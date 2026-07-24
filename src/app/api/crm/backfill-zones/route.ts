import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { nearestZone } from "@/lib/zones";

// ─── One-time (re-runnable) zone backfill ─────────────────────────────────────
// Assigns the nearest zone to existing leads. Coordinates come from the lead row
// (home_lat/home_lng); for older leads that shared location before coordinates
// were saved on the row, we recover the lat/lng from their stored WhatsApp
// location message ("📍 location:lat,lng"). Safe to run repeatedly.

const MISSING_COLUMN_CODES = new Set(["42703", "PGRST204"]);

export async function POST(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, phone, home_lat, home_lng")
    .limit(10000);
  if (error) {
    console.error("[backfill-zones select]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }

  const all = leads ?? [];
  const needCoords = all.filter((l) => l.home_lat == null || l.home_lng == null);

  // Recover coordinates from stored WhatsApp location messages (most recent per
  // phone) for leads whose row has no coordinates.
  const coordByPhone: Record<string, { lat: number; lng: number }> = {};
  if (needCoords.length) {
    const { data: msgs } = await supabase
      .from("whatsapp_messages")
      .select("wa_phone, message, created_at")
      .eq("direction", "inbound")
      .like("message", "%location:%")
      .order("created_at", { ascending: false })
      .limit(20000);
    for (const m of msgs ?? []) {
      const key = (m.wa_phone ?? "").replace(/\D/g, "").slice(-10);
      if (!key || coordByPhone[key]) continue; // keep most recent
      const mt = (m.message ?? "").match(/location:\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i);
      if (mt) coordByPhone[key] = { lat: parseFloat(mt[1]), lng: parseFloat(mt[2]) };
    }
  }

  // Split into: leads that just need a zone (already have coords) vs leads that
  // also need their recovered coordinates written back.
  const zoneOnly: Record<string, string[]> = {};
  const coordPlusZone: Array<{ id: string; lat: number; lng: number; zone: string }> = [];
  let noCoords = 0;

  for (const l of all) {
    let lat = l.home_lat as number | null;
    let lng = l.home_lng as number | null;
    let recovered = false;
    if (lat == null || lng == null) {
      const key = (l.phone ?? "").replace(/\D/g, "").slice(-10);
      const c = key ? coordByPhone[key] : undefined;
      if (c) { lat = c.lat; lng = c.lng; recovered = true; }
    }
    if (lat == null || lng == null) { noCoords++; continue; }
    const nz = nearestZone(lat, lng);
    if (!nz) { noCoords++; continue; }
    if (recovered) coordPlusZone.push({ id: l.id, lat, lng, zone: nz.name });
    else (zoneOnly[nz.name] ??= []).push(l.id);
  }

  let updated = 0;
  let missingColumn = false;

  // Bulk update leads that already have coordinates — one UPDATE per zone.
  for (const [zone, ids] of Object.entries(zoneOnly)) {
    for (let i = 0; i < ids.length; i += 500) {
      const chunk = ids.slice(i, i + 500);
      const { error: uErr } = await supabase.from("leads").update({ zone }).in("id", chunk);
      if (uErr) {
        if (MISSING_COLUMN_CODES.has(uErr.code ?? "")) { missingColumn = true; break; }
        console.error("[backfill-zones update]", uErr);
        continue;
      }
      updated += chunk.length;
    }
    if (missingColumn) break;
  }

  // Individual updates that also persist the recovered coordinates.
  if (!missingColumn) {
    for (const r of coordPlusZone) {
      const { error: uErr } = await supabase
        .from("leads")
        .update({ home_lat: r.lat, home_lng: r.lng, zone: r.zone })
        .eq("id", r.id);
      if (uErr) {
        if (MISSING_COLUMN_CODES.has(uErr.code ?? "")) { missingColumn = true; break; }
        console.error("[backfill-zones update coord]", uErr);
        continue;
      }
      updated += 1;
    }
  }

  if (missingColumn) {
    return NextResponse.json(
      { error: "The 'zone' column is missing. Run in Supabase: alter table leads add column if not exists zone text;" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    total: all.length,
    updated,
    recoveredFromMessages: coordPlusZone.length,
    noCoords,
  });
}

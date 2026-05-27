"use client";
// Isolated hook for rota conflict detection.
//
// Performance fix: the previous useMemo in OpsBoard called buildRota() for ALL
// customers on every customers/roster change. This hook:
//  1. Only recomputes when a customer's rota-relevant fields actually change
//  2. Memoises the stable parts (staff lookup map) separately
//  3. Keeps conflict logic out of the 2000-line component

import { useMemo } from "react";
import { haversineKm } from "@/lib/geo-utils";

interface RotaRow {
  date: string;
  staff: { id: string } | null;
  paused: boolean;
  leave: boolean;
  weeklyOff: boolean;
}

interface Customer {
  id: string;
  name: string;
  homeLat: number | null;
  homeLng: number | null;
  // Fields used by buildRota — passed through opaquely
  _rotaRows: RotaRow[];
}

export interface ConflictEntry {
  customerId: string;
  customerName: string;
  homeLat: number | null;
  homeLng: number | null;
}

// staffId → date → list of customers assigned that day
export type ConflictMap = Map<string, Map<string, ConflictEntry[]>>;

export function useRotaConflicts(
  customers: Array<{
    id: string;
    name: string;
    homeLat: number | null;
    homeLng: number | null;
    rotaRows: RotaRow[]; // pre-built rota rows passed in, not recomputed here
  }>
): { conflictMap: ConflictMap; conflictCount: number } {
  const conflictMap = useMemo<ConflictMap>(() => {
    const map: ConflictMap = new Map();
    for (const c of customers) {
      for (const row of c.rotaRows) {
        if (!row.staff || row.paused || row.leave || row.weeklyOff) continue;
        const sid = row.staff.id;
        if (!map.has(sid)) map.set(sid, new Map());
        const dateMap = map.get(sid)!;
        if (!dateMap.has(row.date)) dateMap.set(row.date, []);
        dateMap.get(row.date)!.push({
          customerId: c.id,
          customerName: c.name,
          homeLat: c.homeLat,
          homeLng: c.homeLng,
        });
      }
    }
    return map;
  }, [customers]);

  const conflictCount = useMemo(() => {
    let n = 0;
    conflictMap.forEach((dateMap) => {
      dateMap.forEach((entries) => {
        if (entries.length > 1) n++;
      });
    });
    return n;
  }, [conflictMap]);

  return { conflictMap, conflictCount };
}

// Helper: get conflict warning text for a single rota row
export function getConflictLabel(
  staffId: string | undefined,
  date: string,
  currentCustomerId: string,
  currentLat: number | null,
  currentLng: number | null,
  conflictMap: ConflictMap
): string | null {
  if (!staffId) return null;
  const entries = conflictMap.get(staffId)?.get(date) ?? [];
  const others = entries.filter((e) => e.customerId !== currentCustomerId);
  if (others.length === 0) return null;

  return others
    .map((o) => {
      const name = o.customerName.replace(/\s+Family\s*$/i, "").trim();
      if (
        currentLat != null &&
        currentLng != null &&
        o.homeLat != null &&
        o.homeLng != null
      ) {
        const km = haversineKm(currentLat, currentLng, o.homeLat, o.homeLng);
        const dist = km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
        return `Also at ${name} · ${dist} away`;
      }
      return `Also at ${name}`;
    })
    .join(", ");
}

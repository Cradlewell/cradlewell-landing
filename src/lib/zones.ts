// ─── Operational zones (named hubs) ──────────────────────────────────────────
// A lead's zone is decided by NEAREST zone center to their shared GPS location,
// measured with haversineKm(). Each zone is just a name + a center coordinate.
//
// Each named locality is its own zone; a lead is assigned the nearest one.

import { haversineKm } from "./geo-utils";

export interface Zone {
  name: string;
  lat: number;
  lng: number;
}

export const ZONES: Zone[] = [
  // ── East ──
  { name: "Whitefield",          lat: 12.971389, lng: 77.750130 },
  { name: "Bellandur",           lat: 12.931639, lng: 77.673482 },
  { name: "Marathahalli",        lat: 12.956000, lng: 77.709200 },
  { name: "Mahadevapura",        lat: 12.990420, lng: 77.684170 },
  { name: "Brookefield",         lat: 12.973864, lng: 77.713768 },
  { name: "Varthur",             lat: 12.938879, lng: 77.741204 },
  { name: "Hoodi",               lat: 12.989499, lng: 77.712040 },
  { name: "KR Puram",            lat: 13.007400, lng: 77.695400 },
  // ── South ──
  { name: "HSR Layout",          lat: 12.912189, lng: 77.648023 },
  { name: "Koramangala",         lat: 12.932531, lng: 77.626941 },
  { name: "Bannerghatta Road",   lat: 12.907371, lng: 77.600597 },
  { name: "Jayanagar",           lat: 12.925000, lng: 77.593800 },
  { name: "JP Nagar",            lat: 12.913195, lng: 77.587732 },
  { name: "Electronic City",     lat: 12.840711, lng: 77.676369 },
  { name: "BTM Layout",          lat: 12.916576, lng: 77.610116 },
  { name: "Bommanahalli",        lat: 12.898360, lng: 77.617947 },
  { name: "Arekere",             lat: 12.883000, lng: 77.598100 },
  { name: "Begur",               lat: 12.875796, lng: 77.635784 },
  // ── North ──
  { name: "Hebbal",              lat: 13.035781, lng: 77.597008 },
  { name: "Thanisandra",         lat: 13.057860, lng: 77.635510 },
  { name: "Yelahanka",           lat: 13.094454, lng: 77.586014 },
  { name: "Hennur Road",         lat: 13.037100, lng: 77.646287 },
  { name: "Jakkur",              lat: 13.074417, lng: 77.605509 },
  { name: "Nagawara",            lat: 13.033500, lng: 77.622400 },
  { name: "Kalyan Nagar",        lat: 13.028005, lng: 77.639969 },
  { name: "RT Nagar",            lat: 13.019318, lng: 77.595718 },
  { name: "Vidyaranyapura",      lat: 13.081072, lng: 77.556167 },
  // ── West ──
  { name: "Rajajinagar",         lat: 12.992634, lng: 77.553642 },
  { name: "Malleshwaram",        lat: 13.003100, lng: 77.564300 },
  { name: "Yeshwanthpur",        lat: 13.027966, lng: 77.540916 },
  { name: "Vijayanagar",         lat: 12.971940, lng: 77.532745 },
  { name: "Rajarajeshwari Nagar", lat: 12.914600, lng: 77.520700 },
  { name: "Nagarbhavi",          lat: 12.961025, lng: 77.512688 },
  { name: "Banashankari",        lat: 12.925453, lng: 77.546761 },
  { name: "Kengeri",             lat: 12.899623, lng: 77.482697 },
  { name: "Uttarahalli",         lat: 12.905786, lng: 77.542639 },
  // ── Central ──
  { name: "Indiranagar",         lat: 12.971891, lng: 77.641151 },
  { name: "MG Road",             lat: 12.973800, lng: 77.611900 },
  { name: "Shivajinagar",        lat: 12.987469, lng: 77.604922 },
  { name: "Ulsoor",              lat: 12.979178, lng: 77.625431 },
  { name: "Richmond Town",       lat: 12.962542, lng: 77.604107 },
  { name: "C. V. Raman Nagar",   lat: 12.982854, lng: 77.660843 },
  { name: "Majestic",            lat: 12.976347, lng: 77.571499 },
  { name: "Chamarajpet",         lat: 12.958627, lng: 77.563375 },
  { name: "Chickpet",            lat: 12.970626, lng: 77.577695 },
];

// Optional coverage cap: if the nearest zone is farther than this many km, the
// lead is marked "Out of coverage" instead of force-assigned. Set to null to
// always return the nearest zone (the behaviour you described).
export const MAX_ZONE_KM: number | null = null;

// Returns the nearest zone to a coordinate, with the distance in km.
// null when coordinates are missing or no zones are configured.
export function nearestZone(
  lat?: number | null,
  lng?: number | null
): { name: string; km: number } | null {
  if (lat == null || lng == null || !ZONES.length) return null;

  let best: { name: string; km: number } | null = null;
  for (const z of ZONES) {
    const km = haversineKm(lat, lng, z.lat, z.lng);
    if (!best || km < best.km) best = { name: z.name, km };
  }
  if (best && MAX_ZONE_KM != null && best.km > MAX_ZONE_KM) {
    return { name: "Out of coverage", km: best.km };
  }
  return best;
}

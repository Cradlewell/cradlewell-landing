// ─── Forward geocoding: typed address → coordinates ───────────────────────────
// The WhatsApp bot gets a GPS pin, but the website form only collects a typed
// address, so a website lead had no coordinates at all and could never be
// distance-ranked on the Nearby Staff board.
//
// OpenStreetMap Nominatim, the same service the WhatsApp route reverse-geocodes
// against. Its usage policy requires an identifying User-Agent and at most one
// request per second, which every caller here respects.

import { ZONES } from "./zones";

// Every operational zone is inside Bengaluru, and a free-text Indian address
// ("#113, 4th A Main Rd, Thayappa Garden") matches same-named streets in half a
// dozen other states. Bounding the search to the city keeps a near-miss inside
// Bengaluru instead of dropping the lead 1000 km away with a confident-looking
// coordinate. left,top,right,bottom as lon,lat pairs.
const BENGALURU_VIEWBOX = "77.35,13.20,77.85,12.75";

// Nominatim allows one request per second. The attempt ladder below issues
// several requests for one address, so it paces itself too.
export const NOMINATIM_MIN_INTERVAL_MS = 1100;

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface GeoPoint {
  lat: number;
  lng: number;
}

// Segments carrying no locality signal. A flat or floor never helps place an
// address and regularly derails the match onto an unrelated numbered street.
const NOISE_SEGMENT =
  /^(ground|first|second|third|[0-9]+(st|nd|rd|th)?)?\s*(floor|flr|blk|block|flat|door|no\.?|house|h\.?no\.?)\b/i;
const NUMERIC_ONLY = /^[#\d\s\-/]+$/;

/**
 * Queries to try, most specific first. Every rung keeps enough of the address to
 * stay unambiguous: truncating to a trailing word or two was tried and produced
 * confidently wrong pins — "It's Whitefield hagdur main road" matched a "Main
 * Road" clear across the city — and a wrong pin is worse than no pin, because
 * the board presents it as fact.
 */
function buildQueryLadder(raw: string): string[] {
  const clean = raw.replace(/\s+/g, " ").trim();
  const segments = clean
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s && !NOISE_SEGMENT.test(s) && !NUMERIC_ONLY.test(s));

  const ladder: string[] = [];
  const push = (v: string) => {
    const t = v.trim();
    if (t.length >= 4 && !ladder.includes(t)) ladder.push(t);
  };

  push(segments.join(", "));
  // House and building names lead the address and are the least likely part to
  // be on the map, so peel them off from the front.
  for (let i = 1; i < Math.min(segments.length, 3); i++) push(segments.slice(i).join(", "));
  if (segments.length > 1) push(segments[segments.length - 1]);

  // Last resort: an operational zone named anywhere in the text. Unlike an
  // arbitrary word fragment this is a known Bengaluru locality, so it degrades
  // to locality precision rather than to a different part of the city.
  const lower = clean.toLowerCase();
  const zone = ZONES.find((z) => lower.includes(z.name.toLowerCase()));
  if (zone) push(zone.name);

  return ladder;
}

async function queryNominatim(text: string): Promise<GeoPoint | null> {
  // Nominatim needs the city to disambiguate; most people omit it because the
  // form is already city-specific.
  const query = /b(?:e|a)ngal(?:o|u)r/i.test(text) ? text : `${text}, Bengaluru, Karnataka, India`;
  const url =
    `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&countrycodes=in` +
    `&viewbox=${BENGALURU_VIEWBOX}&bounded=1&q=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "CradlewellCRM/1.0 (leads geocoding)" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      console.warn("[geocode] Nominatim returned", res.status);
      return null;
    }
    const data = await res.json();
    const hit = Array.isArray(data) ? data[0] : null;
    if (!hit) return null;
    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    // parseFloat("") is NaN, and NaN coordinates would be written to the row and
    // then poison every haversine distance computed against them.
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return { lat, lng };
  } catch (err) {
    console.warn("[geocode] request failed:", err);
    return null;
  }
}

/**
 * Best-effort. Returns null on a miss, a timeout, or any network error — a lead
 * without coordinates is the pre-existing state and is always preferable to a
 * wrong pin, so no caller should treat null as failure. Junk in the address
 * field ("Call me", "what is cost") lands here and correctly stays unplaced.
 *
 * Costs up to one second per ladder rung, so callers should keep it off the
 * request path a user is waiting on.
 */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  const trimmed = address.trim();
  // The Aria chat widget sends a locality picked from a fixed dropdown rather
  // than a street address, so a perfectly good value can be one short word
  // ("Hebbal", "Domlur"). Only reject what is too short to be a place name at
  // all; junk like "Call me" is left to Nominatim, which already fails to match
  // it, rather than to a length rule that also throws out real localities.
  if (trimmed.length < 4) return null;
  // A dropdown placeholder, not a place.
  if (/^other$/i.test(trimmed)) return null;

  const ladder = buildQueryLadder(address);
  for (let i = 0; i < ladder.length; i++) {
    if (i > 0) await sleep(NOMINATIM_MIN_INTERVAL_MS);
    const point = await queryNominatim(ladder[i]);
    if (point) return point;
  }
  return null;
}

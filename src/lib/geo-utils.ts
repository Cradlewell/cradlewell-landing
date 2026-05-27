// Haversine distance and Bangalore zone mapping — single source of truth
// Used by: ops/customers API, crm/staff-availability API, OpsBoard.jsx, OpsMap.jsx

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function fmtKm(km: number): string {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

export type BangaloreZone = "Central" | "North" | "East" | "South" | "West";

const ZONE_PATTERNS: Array<[BangaloreZone, RegExp]> = [
  [
    "North",
    /hebbal|yelahanka|jakkur|thanisandra|nagawara|manyata|hennur|hbr layout|banaswadi|kalyan nagar|kammanahalli|rt nagar|sahakara nagar|sanjay nagar|vidyaranyapura|kodigehalli|jalahalli|peenya(?! industrial)|abbigere|dasarahalli|yeshwanthpur|mathikere|nagasandra|bagaluru|kattigenahalli|byrathi|hegde nagar|virupakshapura|rmv extension|devanahalli|kempegowda|airport/,
  ],
  [
    "East",
    /whitefield|kadugodi|hoodi|mahadevapura|kr puram|ramamurthi nagar|dooravani nagar|kaggadasapura|cv raman nagar|vibhutipura|marathahalli|bellandur|doddanekundi|brookefield|munnekollal|munekollal|varthur|panathur|balagere|bhoganahalli|kadubeesanahalli|indiranagar|domlur|\bhal\b|old airport road|new tippasandra|challaghatta|kasturi nagar|hudi|itpl|outer ring road|sarjapur road|choodasandra|doddakannali|chikkabellandur|kodathi|kasavanahalli|carmelaram|hadosiddapura/,
  ],
  [
    "South",
    /jayanagar|jp nagar|btm layout|hsr layout|koramangala|bannerghatta|basavanagudi|kumaraswamy layout|uttarahalli|banashankari|konanakunte|kanakapura|subramanyapura|padmanabhanagar|bilekahalli|arakere|gottigere|kalena agrahara|hulimavu|\bbegur|bommanahalli|hongasandra|mangammanapalya|kudlu|parappana agrahara|singasandra|electronic city|electronics city|bettadasanapura|heelalige|chandapura|hosur road|adugodi|neelasandra|shanti nagar|mavalli|bikasipura|chikkallasandra|hosakerehalli|\bsarjapur\b/,
  ],
  [
    "West",
    /vijayanagar|rajajinagar|basaveshwara nagar|nagarabhavi|rr nagar|kengeri|mysuru road|mysore road|magadi road|chandra layout|mahalakshmi layout|nandini layout|kamakshipalya|bedarahalli|annapurneshwari nagar|smv layout|nagdevanahalli|guddadahalli|binnipete|kempapura agrahara|hegganahalli|hosahalli|mudahalli|raja rajeshwari nagar|sunkadakatte|peenya industrial/,
  ],
];

export function areaToZone(area: string | undefined): BangaloreZone {
  if (!area) return "Central";
  const a = area.toLowerCase();
  for (const [zone, pattern] of ZONE_PATTERNS) {
    if (pattern.test(a)) return zone;
  }
  return "Central";
}

"use client";

// Browser-side helpers for Meta Pixel / Conversions API deduplication.
// The Pixel and the server both report the same form submission; without a
// shared event id Meta counts one conversion twice, which inflates reported
// leads and feeds bad signal into ad optimisation.

// Id shared between the fbq call and the payload posted to /api/lead.
export function newEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `evt-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const hit = document.cookie.split("; ").find(c => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : undefined;
}

// The _fbc cookie holds the ad click id and is Meta's strongest match signal.
// The Pixel only writes it once it has loaded, so on a first landing straight
// from an ad the cookie can still be absent while fbclid sits in the URL —
// build the value from the parameter in that case, in Meta's documented
// fb.1.<timestamp>.<fbclid> format.
export function readFbc(): string {
  const existing = cookie("_fbc");
  if (existing) return existing;
  if (typeof window === "undefined") return "";
  const fbclid = new URLSearchParams(window.location.search).get("fbclid");
  return fbclid ? `fb.1.${Date.now()}.${fbclid}` : "";
}

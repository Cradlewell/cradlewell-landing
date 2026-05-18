import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";

function areaToZone(area: string | undefined): string {
  if (!area) return "Central";
  const a = area.toLowerCase();

  if (/hebbal|yelahanka|nagawara|manyata|jakkur|devanahalli|hennur|thanisandra|banaswadi|hbr layout|yeshwanthpur|jalahalli|peenya|sanjeevani|kempegowda|airport/.test(a))
    return "North";

  if (/whitefield|marathahalli|old airport|kr puram|mahadevapura|hoodi|outer ring|bellandur|sarjapur road|hal\b|itpl/.test(a))
    return "East";

  if (/jayanagar|jp nagar|btm|bannerghatta|basavanagudi|electronic city|hosur|kanakapura|subramanyapura|hsr|sarjapur\b/.test(a))
    return "South";

  if (/vijayanagar|rajajinagar|basaveshwara|kengeri|magadi|mathikere|mahalakshmi layout|chandra layout|bapuji|tumkur|mysuru road|mysore road|rr nagar/.test(a))
    return "West";

  // Central: MG Road, Brigade Road, Cubbon Park, Chickpet, Indiranagar, RT Nagar, Koramangala (border)
  return "Central";
}

function daysSince(iso: string | undefined): number {
  if (!iso) return 0;
  const start = new Date(iso + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
}

function buildBadge(lead: Record<string, unknown>, closure: Record<string, unknown> | null): string {
  const service = (lead.service_required as string | undefined) ?? "Care";
  const days = daysSince(lead.care_start_date as string | undefined);
  const pkg = (lead.service_days as number | undefined) ?? (closure?.final_package as string | undefined);
  const pkgLabel = typeof pkg === "number" ? `${pkg}d` : (pkg ?? "");
  if (days <= 0) return `Awaiting · ${service}`;
  return [
    `Day ${days}`,
    service,
    pkgLabel,
  ].filter(Boolean).join(" · ");
}

export async function GET() {
  const { data: leads, error: leadsErr } = await supabase
    .from("leads")
    .select("*")
    .eq("stage", "Closed Won")
    .order("created_at", { ascending: false });

  if (leadsErr) return NextResponse.json({ error: leadsErr.message }, { status: 500 });
  if (!leads || leads.length === 0) return NextResponse.json([]);

  const leadIds = leads.map((l) => l.id);
  const { data: closures } = await supabase
    .from("closures")
    .select("*")
    .in("lead_id", leadIds)
    .eq("type", "Won");

  const closureByLead = new Map<string, Record<string, unknown>>();
  for (const c of closures ?? []) closureByLead.set(c.lead_id, c);

  const customers = leads.map((lead) => {
    const closure = closureByLead.get(lead.id) ?? null;
    return {
      id: lead.id,
      name: lead.name,
      zone: areaToZone(lead.area),
      area: lead.area ?? "",
      staff: [],
      status: lead.care_start_date ? "idle" : "attention",
      badge: buildBadge(lead, closure),
      serviceRequired: lead.service_required ?? null,
      careStartDate: lead.care_start_date ?? null,
      serviceDays: lead.service_days ?? null,
      shiftTime: lead.shift_time ?? null,
      shiftHoursCount: lead.shift_hours_count ?? null,
      preferredShift: lead.preferred_shift ?? null,
      finalPackage: closure?.final_package ?? null,
      finalAmount: closure?.final_amount ?? null,
      paymentStatus: closure?.payment_status ?? null,
      closureDate: closure?.closure_date ?? null,
      phone: lead.phone ?? null,
    };
  });

  return NextResponse.json(customers);
}

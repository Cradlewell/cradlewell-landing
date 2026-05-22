import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";

function areaToZone(area: string | undefined): string {
  if (!area) return "Central";
  const a = area.toLowerCase();

  // North Bangalore
  if (/hebbal|yelahanka|jakkur|thanisandra|nagawara|manyata|hennur|hbr layout|banaswadi|kalyan nagar|kammanahalli|rt nagar|sahakara nagar|sanjay nagar|vidyaranyapura|kodigehalli|jalahalli|peenya(?! industrial)|abbigere|dasarahalli|yeshwanthpur|mathikere|nagasandra|bagaluru|kattigenahalli|byrathi|hegde nagar|virupakshapura|rmv extension|devanahalli|kempegowda|airport/.test(a))
    return "North";

  // East Bangalore
  if (/whitefield|kadugodi|hoodi|mahadevapura|kr puram|ramamurthi nagar|dooravani nagar|kaggadasapura|cv raman nagar|vibhutipura|marathahalli|bellandur|doddanekundi|brookefield|munnekollal|munekollal|varthur|panathur|balagere|bhoganahalli|kadubeesanahalli|indiranagar|domlur|\bhal\b|old airport road|new tippasandra|challaghatta|kasturi nagar|hudi|itpl|outer ring road|sarjapur road|choodasandra|doddakannali|chikkabellandur|kodathi|kasavanahalli|carmelaram|hadosiddapura/.test(a))
    return "East";

  // South Bangalore
  if (/jayanagar|jp nagar|btm layout|hsr layout|koramangala|bannerghatta|basavanagudi|kumaraswamy layout|uttarahalli|banashankari|konanakunte|kanakapura|subramanyapura|padmanabhanagar|bilekahalli|arakere|gottigere|kalena agrahara|hulimavu|\bbegur|bommanahalli|hongasandra|mangammanapalya|kudlu|parappana agrahara|singasandra|electronic city|electronics city|bettadasanapura|heelalige|chandapura|hosur road|adugodi|neelasandra|shanti nagar|mavalli|bikasipura|chikkallasandra|hosakerehalli|\bsarjapur\b/.test(a))
    return "South";

  // West Bangalore
  if (/vijayanagar|rajajinagar|basaveshwara nagar|nagarabhavi|rr nagar|kengeri|mysuru road|mysore road|magadi road|chandra layout|mahalakshmi layout|nandini layout|kamakshipalya|bedarahalli|annapurneshwari nagar|smv layout|nagdevanahalli|guddadahalli|binnipete|kempapura agrahara|hegganahalli|hosahalli|mudahalli|raja rajeshwari nagar|sunkadakatte|peenya industrial/.test(a))
    return "West";

  // Central Bangalore (also fallback)
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

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { data: leads, error: leadsErr } = await supabase
    .from("leads")
    .select("*")
    .eq("stage", "Closed Won")
    .order("created_at", { ascending: false });

  if (leadsErr) { console.error("[ops/customers GET]", leadsErr); return NextResponse.json({ error: "Internal server error" }, { status: 500 }); }
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

export async function DELETE(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const { error } = await supabase
    .from("leads")
    .update({ stage: "Inactive" })
    .eq("id", id);

  if (error) { console.error("[ops/customers DELETE]", error); return NextResponse.json({ error: "Failed to delete" }, { status: 500 }); }
  return NextResponse.json({ success: true });
}

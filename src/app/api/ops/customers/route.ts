import { NextRequest } from "next/server";
import { supabase } from "@/lib/supabase-server";
import { requireAuth } from "@/lib/auth-guard";
import { areaToZone } from "@/lib/geo-utils";
import { ok, err, dbErr } from "@/lib/api-response";

// ── Helpers ────────────────────────────────────────────────────────────────────

function daysSince(iso: string | undefined): number {
  if (!iso) return 0;
  const start = new Date(`${iso}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((today.getTime() - start.getTime()) / 86_400_000) + 1;
}

function buildBadge(
  lead: Record<string, unknown>,
  closure: Record<string, unknown> | null
): string {
  const service = (lead.service_required as string | undefined) ?? "Care";
  const days = daysSince(lead.care_start_date as string | undefined);
  const pkg =
    (lead.service_days as number | undefined) ??
    (closure?.final_package as string | undefined);
  const pkgLabel = typeof pkg === "number" ? `${pkg}d` : (pkg ?? "");
  if (days <= 0) return `Awaiting · ${service}`;
  return [`Day ${days}`, service, pkgLabel].filter(Boolean).join(" · ");
}

// ── GET /api/ops/customers ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const [leadsRes, hiddenRes] = await Promise.all([
    supabase
      .from("leads")
      .select("*")
      .eq("stage", "Closed Won")
      .order("created_at", { ascending: false }),
    supabase
      .from("ops_customer_state")
      .select("lead_id")
      .eq("ops_hidden", true),
  ]);

  if (leadsRes.error) return dbErr("ops/customers GET leads", leadsRes.error);

  const leads = leadsRes.data ?? [];
  if (leads.length === 0) return ok([]);

  const leadIds = leads.map((l) => l.id);
  const hiddenIds = new Set((hiddenRes.data ?? []).map((s) => s.lead_id));

  const { data: closures, error: closuresErr } = await supabase
    .from("closures")
    .select("*")
    .in("lead_id", leadIds)
    .eq("type", "Won");

  if (closuresErr) return dbErr("ops/customers GET closures", closuresErr);

  const closureByLead = new Map<string, Record<string, unknown>>();
  for (const c of closures ?? []) closureByLead.set(c.lead_id, c);

  const customers = leads
    .filter((lead) => !hiddenIds.has(lead.id))
    .map((lead) => {
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
        homeLat: lead.home_lat ?? null,
        homeLng: lead.home_lng ?? null,
      };
    });

  return ok(customers);
}

// ── DELETE /api/ops/customers?id=... ──────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const authErr = requireAuth(req);
  if (authErr) return authErr;

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return err("Missing id", 400);

  const { error } = await supabase
    .from("ops_customer_state")
    .upsert(
      { lead_id: id, ops_hidden: true, updated_at: new Date().toISOString() },
      { onConflict: "lead_id" }
    );

  if (error) return dbErr("ops/customers DELETE", error);
  return ok({ success: true });
}

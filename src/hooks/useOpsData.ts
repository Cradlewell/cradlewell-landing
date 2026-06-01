"use client";
// Extracts all server-state from OpsBoard into one hook.
// Before: 3 separate useEffect + 3 useState blocks in OpsBoard main component.
// After: one hook, one loading state, one error state.

import { useCallback, useEffect, useReducer } from "react";
import { apiClient } from "@/lib/api-client";

export interface OpsStaff {
  id: string;
  name: string;
  role: string;
  initials: string;
  color: string;
  phone: string | null;
  location: string | null;
  languages: string | null;
  area: string | null;
  notes: string | null;
  home_lat: number | null;
  home_lng: number | null;
}

export interface OpsCustomer {
  id: string;
  name: string;
  zone: string;
  area: string;
  staff: OpsStaff[];
  status: string;
  badge: string;
  serviceRequired: string | null;
  careStartDate: string | null;
  serviceDays: number | null;
  shiftTime: string | null;
  shiftHoursCount: number | null;
  preferredShift: string | null;
  finalPackage: string | null;
  finalAmount: number | null;
  paymentStatus: string | null;
  closureDate: string | null;
  phone: string | null;
  homeLat: number | null;
  homeLng: number | null;
  // Merged from ops_customer_state
  packageDays?: number;
  startDate?: string;
  rota?: Record<string, string | string[]>;
  rotaReasons?: Record<string, string>;
  pausedDates?: string[];
  leaveDates?: string[];
}

interface State {
  roster: OpsStaff[];
  customers: OpsCustomer[];
  loading: boolean;
  error: string | null;
}

type Action =
  | { type: "LOADED"; roster: OpsStaff[]; customers: OpsCustomer[] }
  | { type: "ERROR"; message: string }
  | { type: "SET_ROSTER"; roster: OpsStaff[] }
  | { type: "SET_CUSTOMERS"; customers: OpsCustomer[] };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "LOADED":
      return { ...state, loading: false, roster: action.roster, customers: action.customers };
    case "ERROR":
      return { ...state, loading: false, error: action.message };
    case "SET_ROSTER":
      return { ...state, roster: action.roster };
    case "SET_CUSTOMERS":
      return { ...state, customers: action.customers };
    default:
      return state;
  }
}

// Module-level 30s TTL cache — prevents redundant API calls on rapid re-mounts.
const CACHE_TTL = 30_000;
let _opsCache: { roster: OpsStaff[]; customers: OpsCustomer[]; ts: number } | null = null;

export function useOpsData() {
  const [state, dispatch] = useReducer(reducer, {
    roster: [],
    customers: [],
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    if (_opsCache && Date.now() - _opsCache.ts < CACHE_TTL) {
      dispatch({ type: "LOADED", roster: _opsCache.roster, customers: _opsCache.customers });
      return;
    }
    try {
      const [staffData, customersData, stateData] = await Promise.all([
        apiClient.get<OpsStaff[]>("/api/ops/staff"),
        apiClient.get<OpsCustomer[]>("/api/ops/customers"),
        apiClient.get<Record<string, unknown>[]>("/api/ops/state"),
      ]);

      const staffMap = new Map(staffData.map((s) => [s.id, s]));
      const stateMap = new Map(stateData.map((s: Record<string, unknown>) => [s.lead_id as string, s]));

      const merged = customersData.map((c) => {
        const st = stateMap.get(c.id);
        if (!st) return c;
        const staff = ((st.staff_ids as string[]) ?? [])
          .map((id) => staffMap.get(id))
          .filter((s): s is OpsStaff => s != null);
        return {
          ...c,
          staff,
          packageDays: (st.package_days as number) ?? undefined,
          startDate: (st.start_date as string) ?? undefined,
          shiftTime: (st.shift_time as string) ?? undefined,
          rota: (st.rota as Record<string, string | string[]>) ?? undefined,
          rotaReasons: (st.rota_reasons as Record<string, string>) ?? undefined,
          pausedDates: (st.paused_dates as string[]) ?? undefined,
          leaveDates: (st.leave_dates as string[]) ?? undefined,
          status: staff.length > 0 ? "active" : (c.status ?? "attention"),
        };
      });

      _opsCache = { roster: staffData, customers: merged, ts: Date.now() };
      dispatch({ type: "LOADED", roster: staffData, customers: merged });
    } catch (e) {
      dispatch({ type: "ERROR", message: e instanceof Error ? e.message : "Failed to load" });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { ...state, reload: load, dispatch };
}

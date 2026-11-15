"use client";
import { useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Kanban, CalendarClock, BarChart3,
  ChevronsLeft, ChevronsRight, X, LogOut,
} from "lucide-react";
import { useLeads, useFollowups, isOverdue, isToday } from "@/lib/crm-store";

type BadgeTone = "red" | "amber" | "blue" | "muted";

const NAV = [
  { href: "/crm",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/crm/leads",     label: "Leads",      icon: Users },
  { href: "/crm/pipeline",  label: "Pipeline",   icon: Kanban },
  { href: "/crm/followups", label: "Follow-ups", icon: CalendarClock },
  { href: "/crm/reports",   label: "Reports",    icon: BarChart3 },
] as const;

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function CRMSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const leads = useLeads();
  const followups = useFollowups();

  // Small live counts beside nav items, like the prototype: new leads (blue),
  // overdue follow-ups (red) or, when none are overdue, today's (amber).
  const badges = useMemo(() => {
    const out: Record<string, { n: number; tone: BadgeTone }> = {};
    const newLeads = leads.filter(l => l.stage === "New Lead").length;
    if (newLeads) out["/crm/leads"] = { n: newLeads, tone: "blue" };
    const open = followups.filter(f => !f.completed);
    const overdue = open.filter(f => isOverdue(f.dueAt) && !isToday(f.dueAt)).length;
    const today = open.filter(f => isToday(f.dueAt)).length;
    if (overdue) out["/crm/followups"] = { n: overdue, tone: "red" };
    else if (today) out["/crm/followups"] = { n: today, tone: "amber" };
    return out;
  }, [leads, followups]);

  const isActive = (href: string) =>
    href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);

  return (
    <>
      <div className={`crm-sidebar-overlay ${mobileOpen ? "show" : ""}`} onClick={onMobileClose} />

      <aside className={`crm-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        <div className="crm-sidebar-header">
          <div className="crm-sidebar-logo-placeholder" aria-hidden>C</div>
          {!collapsed && (
            <div className="crm-sidebar-title">
              <h2>Cradlewell</h2>
              <span>sales</span>
            </div>
          )}
          <button
            onClick={onMobileClose}
            className="crm-icon-btn ms-auto d-md-none"
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        <nav className="crm-nav">
          {!collapsed && <div className="crm-nav-section">Workspace</div>}
          {NAV.map(({ href, label, icon: Icon }) => {
            const badge = badges[href];
            return (
              <button
                key={href}
                onClick={() => { router.push(href); onMobileClose(); }}
                className={`crm-nav-item ${isActive(href) ? "active" : ""}`}
                title={collapsed ? label : undefined}
                aria-label={label}
                aria-current={isActive(href) ? "page" : undefined}
              >
                <Icon size={16} />
                {!collapsed && <span className="crm-nav-label">{label}</span>}
                {!collapsed && badge && (
                  <span className={`crm-nav-badge ${badge.tone === "muted" ? "" : badge.tone}`}>{badge.n}</span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="crm-sidebar-toggle d-none d-md-block" style={{ borderTop: "none" }}>
          <button onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand" : undefined}>
            {collapsed ? <ChevronsRight size={16} /> : <><ChevronsLeft size={16} /><span>Collapse</span></>}
          </button>
        </div>

        <div className="crm-sidebar-toggle">
          <button
            onClick={async () => {
              await fetch("/api/crm/auth", { method: "DELETE" });
              router.push("/crm/login");
              router.refresh();
            }}
            aria-label="Log out"
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut size={16} />
            {!collapsed && <span>Log out</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

"use client";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Kanban, CalendarClock,
  FileText, Trophy, Receipt, BarChart3,
  ChevronLeft, ChevronRight, X, LogOut,
} from "lucide-react";

const NAV = [
  { href: "/crm",            label: "Dashboard",       icon: LayoutDashboard },
  { href: "/crm/leads",      label: "Leads",           icon: Users },
  { href: "/crm/pipeline",   label: "Pipeline",        icon: Kanban },
  { href: "/crm/followups",  label: "Follow-ups",      icon: CalendarClock },
  { href: "/crm/quotations", label: "Quotations",      icon: FileText },
  { href: "/crm/closures",   label: "Closures",        icon: Trophy },
  { href: "/crm/invoice",    label: "Invoice",         icon: Receipt },
  { href: "/crm/reports",    label: "Reports",         icon: BarChart3 },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function CRMSidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    href === "/crm" ? pathname === "/crm" : pathname.startsWith(href);

  return (
    <>
      {/* Mobile overlay */}
      <div
        className={`crm-sidebar-overlay ${mobileOpen ? "show" : ""}`}
        onClick={onMobileClose}
      />

      <aside className={`crm-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Header */}
        <div className="crm-sidebar-header">
          <div className="crm-sidebar-logo-placeholder">C</div>
          {!collapsed && (
            <div className="crm-sidebar-title">
              <h2>Cradlewell</h2>
              <span>Sales CRM</span>
            </div>
          )}
          <button
            onClick={onMobileClose}
            className="crm-btn crm-btn-ghost crm-btn-icon ms-auto d-md-none"
            style={{ minHeight: 32, minWidth: 32 }}
            aria-label="Close sidebar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav */}
        <nav className="crm-nav">
          {NAV.map(({ href, label, icon: Icon }) => (
            <button
              key={href}
              onClick={() => { router.push(href); onMobileClose(); }}
              className={`crm-nav-item ${isActive(href) ? "active" : ""}`}
              title={collapsed ? label : undefined}
              aria-label={label}
            >
              <Icon size={18} />
              {!collapsed && <span className="crm-nav-label">{label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <div className="crm-sidebar-toggle" style={{ borderTop: "1px solid var(--crm-border)" }}>
          <button
            onClick={async () => {
              await fetch("/api/crm/auth", { method: "DELETE" });
              router.push("/crm/login");
              router.refresh();
            }}
            aria-label="Logout"
            title={collapsed ? "Logout" : undefined}
            style={{ color: "#DC2626" }}
          >
            <LogOut size={16} />
            {!collapsed && <span>Logout</span>}
          </button>
        </div>

        {/* Collapse toggle (desktop) */}
        <div className="crm-sidebar-toggle d-none d-md-block">
          <button onClick={onToggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /><span>Collapse</span></>}
          </button>
        </div>
      </aside>
    </>
  );
}

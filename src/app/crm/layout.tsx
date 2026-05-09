"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import CRMSidebar from "@/components/crm/CRMSidebar";
import "./crm.css";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="crm-app">
      <div className="crm-shell">
        <CRMSidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed(c => !c)}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />

        <main className={`crm-main ${collapsed ? "sidebar-collapsed" : ""}`}>
          <header className="crm-header">
            <button
              className="crm-btn crm-btn-ghost crm-btn-icon d-md-none"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={20} />
            </button>
            <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--crm-text)", display: "none" }} className="d-md-block">
              Cradlewell Sales CRM
            </span>
          </header>

          <div className="crm-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

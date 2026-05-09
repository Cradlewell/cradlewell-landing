"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import CRMSidebar from "@/components/crm/CRMSidebar";
import { useDBReady } from "@/lib/crm-store";
import "./crm.css";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const ready = useDBReady();

  if (pathname === "/crm/login") {
    return <>{children}</>;
  }

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
            {ready ? children : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: "1rem" }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  border: "3px solid #E2E8F0",
                  borderTopColor: "#6388FF",
                  animation: "crm-spin 0.7s linear infinite",
                }} />
                <p style={{ color: "var(--crm-text-muted)", fontSize: "0.9rem" }}>Loading CRM data…</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

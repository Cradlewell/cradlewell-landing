"use client";
import { useState } from "react";
import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";
import CRMSidebar from "@/components/crm/CRMSidebar";
import { useDBReady } from "@/lib/crm-store";
import { ToastContainer } from "@/components/ui/toast";
import { ConfirmDialogRoot } from "@/components/ui/confirm-dialog";
import { PageLoader } from "@/components/ui/page-loader";
import { ErrorBoundary } from "@/components/ui/error-boundary";
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
            <span
              style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--crm-text)", display: "none" }}
              className="d-md-block"
            >
              Cradlewell Sales CRM
            </span>
          </header>

          <div className="crm-content">
            <ErrorBoundary>
              {ready ? children : <PageLoader message="Loading CRM data…" />}
            </ErrorBoundary>
          </div>
        </main>
      </div>

      {/* Global providers — no Context needed, module-level APIs */}
      <ToastContainer />
      <ConfirmDialogRoot />
    </div>
  );
}

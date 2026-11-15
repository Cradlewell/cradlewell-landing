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

export default function CRMShell({ children }: { children: React.ReactNode }) {
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
          {/* Mobile-only top bar (hidden ≥768px via CSS) */}
          <header className="crm-header">
            <button
              className="crm-icon-btn"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="crm-sidebar-logo-placeholder" aria-hidden>C</div>
            <span style={{ fontWeight: 600, fontSize: 13 }}>
              Cradlewell <span style={{ fontWeight: 400, color: "var(--cw-ink-4)" }}>sales</span>
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

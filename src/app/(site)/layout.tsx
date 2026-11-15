import type { ReactNode } from "react";
// Bootstrap + site styles load only for the public site (and /operations, which
// imports them itself). The CRM has its own Tailwind design system, and
// Bootstrap's !important spacing utilities (px-3, gap-2…) would override it.
// Order matters: globals.css must come after Bootstrap so site styles win.
import "bootstrap/dist/css/bootstrap.min.css";
import "../globals.css";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

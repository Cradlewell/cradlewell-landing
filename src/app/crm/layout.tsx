import type { Metadata } from "next";
import "./crm.css";

// Renders as "CRM - Cradlewell" via the root layout's title template.
export const metadata: Metadata = {
  title: "CRM",
  robots: { index: false, follow: false },
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

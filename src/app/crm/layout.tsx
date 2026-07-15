import type { Metadata } from "next";
import CRMShell from "@/components/crm/CRMShell";
import "./crm.css";

// Renders as "CRM | Cradlewell" via the root layout's "%s | Cradlewell" template.
export const metadata: Metadata = {
  title: "CRM",
};

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return <CRMShell>{children}</CRMShell>;
}

import type { ReactNode } from "react";
import "./ops.css";

export const metadata = { title: "Operations | Cradlewell" };

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return <div style={{ minHeight: "100vh", overflow: "auto" }}>{children}</div>;
}

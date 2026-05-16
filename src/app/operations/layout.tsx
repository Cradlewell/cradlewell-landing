import type { ReactNode } from "react";

export const metadata = { title: "Operations | Cradlewell" };

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: "fixed", inset: 0, overflow: "hidden", background: "#f5f5f5" }}>
      {children}
    </div>
  );
}

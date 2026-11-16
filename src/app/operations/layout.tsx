import type { ReactNode } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import "../globals.css";
import "./ops.css";

export const metadata = { title: "Operations | Cradlewell", robots: { index: false, follow: false } };

export default function OperationsLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", overflow: "auto" }}>
      {/* globals.css uses the site fonts; the root layout no longer loads them (see (site)/layout.tsx) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700;800&family=Source+Sans+3:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap"
        rel="stylesheet"
      />
      {children}
    </div>
  );
}

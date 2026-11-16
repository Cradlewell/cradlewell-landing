"use client";
import { ModalProvider } from "@/components/ModalContext";
import LayoutClient from "@/components/LayoutClient";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/AIChatWidget";
import MouseEffects from "@/components/MouseEffects";

// The public site's shell (header, footer, chat, booking modal). Used only by
// the (site) layout, so the CRM never renders it.
export default function LandingShell({ children }: { children: React.ReactNode }) {
  return (
    <ModalProvider>
      <LayoutClient />
      <main>{children}</main>
      <Footer />
      <AIChatWidget />
      {/* Site-wide click effect — fixed, click-through overlay */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, pointerEvents: "none", overflow: "hidden" }}>
        <MouseEffects interactionMode="sniper" color="#5F47FF" showLabel={false} />
      </div>
    </ModalProvider>
  );
}

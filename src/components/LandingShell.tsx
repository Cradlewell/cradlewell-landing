"use client";
import { usePathname } from "next/navigation";
import { ModalProvider } from "@/components/ModalContext";
import LayoutClient from "@/components/LayoutClient";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/AIChatWidget";
import MouseEffects from "@/components/MouseEffects";

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCRM = pathname.startsWith("/crm");
  const isOps = pathname.startsWith("/operations");

  if (isCRM || isOps) {
    return <>{children}</>;
  }

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

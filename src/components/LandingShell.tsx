"use client";
import { usePathname } from "next/navigation";
import { ModalProvider } from "@/components/ModalContext";
import LayoutClient from "@/components/LayoutClient";
import Footer from "@/components/Footer";
import AIChatWidget from "@/components/AIChatWidget";

export default function LandingShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isApp = pathname.startsWith("/crm") || pathname.startsWith("/operations");

  if (isApp) {
    return <>{children}</>;
  }

  return (
    <ModalProvider>
      <LayoutClient />
      <main>{children}</main>
      <Footer />
      <AIChatWidget />
    </ModalProvider>
  );
}

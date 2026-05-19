"use client";
import { useRouter } from "next/navigation";
import { OpsBoard } from "@/components/ops/OpsBoard";

export default function OperationsPage() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/ops/auth", { method: "DELETE" });
    router.push("/operations/login");
    router.refresh();
  }

  return (
    <div className="ops-shell">
      <OpsBoard onLogout={handleLogout} />
    </div>
  );
}

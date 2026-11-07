import type { Metadata } from "next";

// Placeholder until the WhatsApp CRM repo is brought in.
export const metadata: Metadata = {
  title: "WhatsApp CRM",
  robots: { index: false, follow: false },
};

export default function WhatsAppCrmPage() {
  return (
    <div className="d-flex align-items-center justify-content-center vh-100 bg-light px-3">
      <div className="text-center">
        <h1 className="fw-bold text-dark">WhatsApp CRM</h1>
        <p className="text-muted mb-0">Coming soon.</p>
      </div>
    </div>
  );
}

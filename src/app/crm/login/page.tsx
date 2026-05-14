"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CRMLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/crm/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        router.push("/crm");
        router.refresh();
      } else {
        setError("Invalid email or password.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #6388FF 0%, #5F47FF 100%)",
      fontFamily: "'Outfit', sans-serif",
    }}>
      <div style={{
        background: "#fff",
        borderRadius: "16px",
        padding: "2.5rem 2rem",
        width: "100%",
        maxWidth: "380px",
        boxShadow: "0 20px 60px rgba(99,136,255,0.25)",
      }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "14px",
            background: "linear-gradient(135deg,#6388FF,#5F47FF)",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 1rem",
          }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#1E293B", margin: 0 }}>
            Cradlewell CRM
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#64748B", margin: "0.35rem 0 0" }}>
            Sales team access only
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "0.4rem" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder=""
              required
              style={{
                width: "100%", padding: "0.65rem 0.9rem",
                border: "1.5px solid #E2E8F0", borderRadius: "8px",
                fontSize: "0.9rem", color: "#1E293B",
                outline: "none", boxSizing: "border-box",
                transition: "border-color 0.15s",
              }}
              onFocus={(e) => (e.target.style.borderColor = "#6388FF")}
              onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
            />
          </div>

          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", display: "block", marginBottom: "0.4rem" }}>
              Password
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=""
                required
                style={{
                  width: "100%", padding: "0.65rem 2.5rem 0.65rem 0.9rem",
                  border: "1.5px solid #E2E8F0", borderRadius: "8px",
                  fontSize: "0.9rem", color: "#1E293B",
                  outline: "none", boxSizing: "border-box",
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#6388FF")}
                onBlur={(e) => (e.target.style.borderColor = "#E2E8F0")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                style={{
                  position: "absolute", right: "0.7rem", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  padding: 0, color: "#94A3B8", display: "flex", alignItems: "center",
                }}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              background: "#FEF2F2", border: "1px solid #FECACA",
              borderRadius: "8px", padding: "0.6rem 0.9rem",
              color: "#DC2626", fontSize: "0.82rem", marginBottom: "1rem",
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "0.75rem",
              background: loading ? "#94A3B8" : "linear-gradient(135deg,#6388FF,#5F47FF)",
              color: "#fff", border: "none", borderRadius: "8px",
              fontSize: "0.95rem", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer",
              transition: "opacity 0.15s",
            }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

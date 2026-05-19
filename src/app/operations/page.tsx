"use client";
import { useState, useEffect } from "react";
import { OpsBoard } from "@/components/ops/OpsBoard";

const SESSION_KEY = "ops_session";
const PASS = process.env.NEXT_PUBLIC_OPS_PASSWORD ?? "cradlewell@ops";

function LoginPage({ onAuth }: { onAuth: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setTimeout(() => {
      if (password === PASS) {
        localStorage.setItem(SESSION_KEY, "1");
        onAuth();
      } else {
        setError("Incorrect password. Please try again.");
        setLoading(false);
      }
    }, 400);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(160deg,#f5f7ff 0%,#f8fafc 60%,#eef2ff 100%)",
      fontFamily: "system-ui, -apple-system, sans-serif", padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 40, justifyContent: "center" }}>
          <div style={{ height: 40, width: 40, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#5F47FF,#a855f7)", flexShrink: 0 }}>
            <div style={{ height: 18, width: 18, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.9)" }} />
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#0f172a", letterSpacing: "0.04em" }}>CRADLEWELL</div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.2em", textTransform: "uppercase", color: "#94a3b8", marginTop: 1 }}>Operations Portal</div>
          </div>
        </div>

        {/* Card */}
        <div style={{ backgroundColor: "#fff", borderRadius: 20, border: "1px solid #e2e8f0", boxShadow: "0 20px 60px -20px rgba(95,71,255,0.15), 0 4px 16px rgba(15,17,21,0.06)", padding: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0f172a", margin: "0 0 6px" }}>Sign in</h2>
          <p style={{ fontSize: 13, color: "#64748b", margin: "0 0 28px" }}>Enter your access password to continue</p>

          <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.1em", color: "#64748b", display: "block", marginBottom: 8 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={show ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password"
                  autoFocus
                  style={{
                    width: "100%", boxSizing: "border-box",
                    backgroundColor: "#f8fafc", border: `1.5px solid ${error ? "#ef4444" : "#e2e8f0"}`,
                    borderRadius: 10, padding: "12px 44px 12px 14px",
                    fontSize: 14, color: "#0f172a", outline: "none",
                    transition: "border-color 0.15s",
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#5F47FF"; e.currentTarget.style.backgroundColor = "#fff"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = error ? "#ef4444" : "#e2e8f0"; e.currentTarget.style.backgroundColor = "#f8fafc"; }}
                />
                <button
                  type="button"
                  onClick={() => setShow(s => !s)}
                  style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "#94a3b8", padding: 4, display: "flex" }}
                >
                  {show
                    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 2l12 12M6.5 6.6A2 2 0 0 0 9.4 9.5M3.5 4.6C2.2 5.5 1.2 6.7 1 8c.8 3.1 3.9 5.5 7 5.5a7 7 0 0 0 2.9-.6M6 2.7A7 7 0 0 1 8 2.5c3.1 0 6.2 2.4 7 5.5-.3 1-.9 2-1.7 2.8" /></svg>
                    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 8c.8-3.1 3.9-5.5 7-5.5S14.2 4.9 15 8c-.8 3.1-3.9 5.5-7 5.5S1.8 11.1 1 8z" /><circle cx="8" cy="8" r="2" /></svg>
                  }
                </button>
              </div>
              {error && <p style={{ fontSize: 12, color: "#ef4444", margin: "6px 0 0" }}>{error}</p>}
            </div>

            <button
              type="submit"
              disabled={loading || !password}
              style={{
                width: "100%", padding: "13px", borderRadius: 10, border: "none",
                background: loading || !password ? "#c4bfff" : "linear-gradient(135deg,#5F47FF,#7c3aed)",
                color: "#fff", fontSize: 14, fontWeight: 600, cursor: loading || !password ? "not-allowed" : "pointer",
                boxShadow: loading || !password ? "none" : "0 4px 14px rgba(95,71,255,0.35)",
                transition: "all 0.15s", letterSpacing: "0.02em",
              }}
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", fontSize: 12, color: "#94a3b8", marginTop: 24 }}>
          Cradlewell Operations · Internal use only
        </p>
      </div>
    </div>
  );
}

export default function OperationsPage() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(localStorage.getItem(SESSION_KEY) === "1");
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (!authed) return <LoginPage onAuth={() => setAuthed(true)} />;

  return (
    <div className="ops-shell">
      <OpsBoard onLogout={() => { localStorage.removeItem(SESSION_KEY); setAuthed(false); }} />
    </div>
  );
}

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

  const inputStyle: React.CSSProperties = {
    width: "100%", height: 36, padding: "0 12px",
    border: "1px solid rgb(230 228 223)", borderRadius: 6,
    fontSize: 13, color: "#1F1F1F", background: "#fff",
    outline: "none", boxSizing: "border-box", fontFamily: "inherit",
    transition: "border-color .15s, box-shadow .15s",
  };
  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#B4436C";
    e.target.style.boxShadow = "0 0 0 3px rgba(180,67,108,.12)";
  };
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "rgb(230 228 223)";
    e.target.style.boxShadow = "none";
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 500, color: "rgb(92 92 92)", display: "block", marginBottom: 6,
  };

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
      background: "rgb(247 246 243)",
      fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
      fontFeatureSettings: '"cv11", "ss01"',
      color: "#1F1F1F",
      WebkitFontSmoothing: "antialiased",
    }}>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <style>{`@keyframes cw-rise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}@media (prefers-reduced-motion: reduce){.cw-login{animation:none!important}}`}</style>

      <div className="cw-login" style={{ width: "100%", maxWidth: 360, animation: "cw-rise .4s cubic-bezier(0.22,1,0.36,1) both" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <div style={{
            width: 24, height: 24, borderRadius: 6, background: "#B4436C", color: "#fff",
            fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center",
          }}>C</div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            Cradlewell <span style={{ fontWeight: 400, color: "rgb(112 112 112)" }}>sales</span>
          </span>
        </div>

        <div style={{
          background: "#fff",
          border: "1px solid rgb(238 237 234)",
          borderRadius: 12,
          padding: "24px 24px 20px",
          boxShadow: "0 2px 10px rgba(0,0,0,.04)",
        }}>
          <h1 style={{ fontSize: 20, fontWeight: 500, letterSpacing: "-0.01em", margin: 0 }}>Sign in</h1>
          <p style={{ fontSize: 13, color: "rgb(112 112 112)", margin: "4px 0 20px" }}>
            Sales team access only.
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label htmlFor="crm-email" style={labelStyle}>Email</label>
              <input
                id="crm-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                style={inputStyle}
                onFocus={focusOn}
                onBlur={focusOff}
              />
            </div>

            <div style={{ marginBottom: 18 }}>
              <label htmlFor="crm-password" style={labelStyle}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="crm-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ ...inputStyle, paddingRight: 38 }}
                  onFocus={focusOn}
                  onBlur={focusOff}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{
                    position: "absolute", right: 6, top: "50%", transform: "translateY(-50%)",
                    width: 26, height: 26, borderRadius: 6,
                    background: "none", border: "none", cursor: "pointer",
                    padding: 0, color: "rgb(138 134 128)", display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  {showPassword ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div role="alert" style={{
                display: "flex", alignItems: "center", gap: 6,
                fontSize: 12, color: "#B91C1C", marginBottom: 14,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626", flexShrink: 0 }} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%", height: 36,
                background: "#1F1F1F", color: "#fff",
                border: "none", borderRadius: 6,
                fontSize: 13, fontWeight: 500, fontFamily: "inherit",
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.5 : 1,
                transition: "background-color .15s, opacity .15s",
              }}
              onMouseEnter={(e) => { if (!loading) e.currentTarget.style.background = "#000"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#1F1F1F"; }}
            >
              {loading ? "Signing in…" : "Continue"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

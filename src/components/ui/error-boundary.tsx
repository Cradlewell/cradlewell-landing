"use client";
import { Component, type ReactNode } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  /** Custom fallback UI. Omit to use the default error card. */
  fallback?: ReactNode | ((error: Error, reset: () => void) => ReactNode);
  /** Called with the caught error — useful for error reporting services. */
  onError?: (error: Error, info: { componentStack: string }) => void;
}

interface State {
  error: Error | null;
}

/**
 * Catches render-time errors in the subtree and displays a recovery UI.
 * Class component required — React does not yet support error boundaries as
 * function components.
 *
 * @example
 * <ErrorBoundary onError={(e) => Sentry.captureException(e)}>
 *   <SomePage />
 * </ErrorBoundary>
 *
 * // With custom fallback:
 * <ErrorBoundary fallback={(err, reset) => <button onClick={reset}>Retry</button>}>
 *   ...
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    this.props.onError?.(error, info);
    // In development, surface the component stack to the console
    if (process.env.NODE_ENV !== "production") {
      console.error("[ErrorBoundary]", error, info.componentStack);
    }
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return typeof this.props.fallback === "function"
        ? this.props.fallback(error, this.reset)
        : this.props.fallback;
    }

    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "3rem 2rem",
          textAlign: "center",
        }}
      >
        <div style={{
          width: 52, height: 52, borderRadius: 14,
          background: "#FEF2F2",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <AlertTriangle size={24} color="#DC2626" aria-hidden />
        </div>

        <div>
          <div style={{
            fontWeight: 700, fontSize: "0.95rem",
            color: "#1E293B", marginBottom: 6,
          }}>
            Something went wrong
          </div>
          <div style={{
            fontSize: "0.8rem", color: "#64748B",
            maxWidth: 320, lineHeight: 1.55,
          }}>
            {error.message || "An unexpected error occurred."}
          </div>
        </div>

        <button className="crm-btn crm-btn-secondary" onClick={this.reset}>
          <RotateCcw size={14} /> Try again
        </button>
      </div>
    );
  }
}

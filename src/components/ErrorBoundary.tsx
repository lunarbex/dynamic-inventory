"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
  stack: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "", stack: "" };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error.message ?? String(error),
      stack: error.stack ?? "",
    };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Keep full details in the console for debugging
    console.error("[ErrorBoundary] Caught:", error.message);
    console.error("[ErrorBoundary] Stack:", error.stack);
    console.error("[ErrorBoundary] Component tree:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-6 py-12"
          style={{ background: "var(--parchment)" }}
        >
          <div className="w-full max-w-sm text-center">
            <p className="text-5xl mb-4">📖</p>
            <h1
              className="font-serif text-xl font-bold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Something went wrong
            </h1>
            <p className="text-sm mb-4 leading-relaxed" style={{ color: "var(--ink-light)" }}>
              InvenStories ran into an error. Try reloading — if the problem
              persists, check your internet connection.
            </p>

            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 font-semibold text-sm transition-opacity hover:opacity-80 mb-6"
              style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
            >
              Reload app
            </button>

            {/* Collapsible error details for debugging */}
            <details className="text-left mt-2">
              <summary
                className="text-xs cursor-pointer select-none uppercase tracking-wide transition-opacity hover:opacity-70"
                style={{ color: "var(--ink-light)" }}
              >
                Error details
              </summary>
              <pre
                className="mt-2 text-xs leading-relaxed overflow-auto max-h-40 p-3 rounded"
                style={{
                  background: "var(--parchment-dark)",
                  color: "var(--ink-mid)",
                  border: "1px solid var(--border)",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {this.state.message}
                {this.state.stack ? `\n\n${this.state.stack.slice(0, 600)}` : ""}
              </pre>
            </details>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

"use client";

import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary] Caught error:", error.message);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex items-center justify-center px-6"
          style={{ background: "var(--parchment)" }}
        >
          <div className="text-center max-w-sm">
            <p className="text-5xl mb-4">📖</p>
            <h1
              className="font-serif text-xl font-bold mb-2"
              style={{ color: "var(--ink)" }}
            >
              Something went wrong
            </h1>
            <p
              className="text-sm mb-6 leading-relaxed"
              style={{ color: "var(--ink-light)" }}
            >
              InvenStories couldn&apos;t load. Please check your internet
              connection and try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
            >
              Reload app
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

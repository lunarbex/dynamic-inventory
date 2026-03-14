"use client";

import { BookOpen } from "lucide-react";

interface WelcomeModalProps {
  onTakeTour: () => void;
  onSkip: () => void;
}

export function WelcomeModal({ onTakeTour, onSkip }: WelcomeModalProps) {
  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: "rgba(44,36,22,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="w-full max-w-sm flex flex-col items-center text-center p-8 gap-5"
        style={{
          background: "var(--parchment-light)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          boxShadow: "0 20px 60px rgba(44,36,22,0.25)",
        }}
      >
        {/* Icon */}
        <div
          className="flex items-center justify-center"
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: "var(--parchment-dark)",
            border: "1px solid var(--border)",
          }}
        >
          <BookOpen className="w-7 h-7" style={{ color: "var(--gold)" }} />
        </div>

        {/* Decorative rule */}
        <div className="flex items-center gap-3 w-full">
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--gold)" }}>✦</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        {/* Text */}
        <div className="space-y-2">
          <h1 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>
            Welcome to InvenStories
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--ink-mid)" }}>
            Your belongings as chapters in a living archive.
          </p>
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink-light)" }}>
            Objects carry stories across generations — let&apos;s preserve them together.
          </p>
        </div>

        {/* Decorative rule */}
        <div className="flex items-center gap-3 w-full">
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          <span className="text-xs" style={{ color: "var(--gold)" }}>✦</span>
          <div className="h-px flex-1" style={{ background: "var(--border)" }} />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 w-full">
          <button
            onClick={onTakeTour}
            className="w-full py-3 text-sm font-semibold transition-opacity hover:opacity-85"
            style={{
              background: "var(--gold)",
              color: "var(--parchment-light)",
              borderRadius: "6px",
            }}
          >
            Take the tour
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-light)" }}
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}

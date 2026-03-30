"use client";

import { useState } from "react";
import { AlertCircle, RefreshCw, Plus, X } from "lucide-react";
import type { TransitionInsightType, TransitionDoulaData } from "@/lib/types";

const ACCENT = "#661830";
const ACCENT_LIGHT = "#ecdde4";

const TYPE_META: Record<TransitionInsightType, { label: string; description: string }> = {
  step:               { label: "Today's step",       description: "One concrete thing" },
  delegation:         { label: "Ask for help",        description: "You don't have to do this alone" },
  decision_framework: { label: "A way to decide",     description: "When you're stuck" },
  permission:         { label: "Permission",          description: "You're allowed" },
  rest:               { label: "Rest",                description: "That's enough for today" },
};

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h > 23) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

interface TransitionDoulaPanelProps {
  data: TransitionDoulaData | null;
  running: boolean;
  onRequestGuidance: (context: "morning" | "evening" | "overwhelmed" | "refresh") => void;
  onAddDecideLater: (name: string) => void;
  onRemoveDecideLater: (id: string) => void;
}

export function TransitionDoulaPanel({
  data,
  running,
  onRequestGuidance,
  onAddDecideLater,
  onRemoveDecideLater,
}: TransitionDoulaPanelProps) {
  const [input, setInput] = useState("");
  const hour = new Date().getHours();

  const guidance = data?.currentGuidance ?? null;
  const decideLaterItems = data?.decideLaterItems ?? [];

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed) return;
    onAddDecideLater(trimmed);
    setInput("");
  }

  return (
    <div className="mt-3 space-y-5">
      <div className="h-px" style={{ background: "var(--border)" }} />

      {/* ── Guidance card ─────────────────────────────────────────── */}
      {!guidance ? (
        <div className="text-center space-y-3 py-1">
          <p className="text-xs leading-relaxed font-serif italic" style={{ color: "var(--ink-mid)" }}>
            When you're ready, I'll offer one small step — just for today.
          </p>
          <button
            onClick={() => onRequestGuidance(hour < 12 ? "morning" : "refresh")}
            disabled={running}
            className="px-5 py-2 text-xs font-semibold transition-opacity hover:opacity-75 disabled:opacity-50"
            style={{
              background: ACCENT_LIGHT,
              color: ACCENT,
              borderRadius: "6px",
              border: `1px solid ${ACCENT}30`,
            }}
          >
            {running ? "One moment…" : "Begin"}
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {/* Badge + timestamp */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span
                className="text-[9px] font-semibold tracking-[0.15em] uppercase px-2 py-0.5"
                style={{ background: ACCENT_LIGHT, color: ACCENT, borderRadius: "4px" }}
              >
                {TYPE_META[guidance.type]?.label ?? guidance.type}
              </span>
              <span className="text-[10px] italic" style={{ color: "var(--ink-light)" }}>
                {TYPE_META[guidance.type]?.description}
              </span>
            </div>
            <span className="text-[10px] shrink-0" style={{ color: "var(--ink-light)" }}>
              {timeAgo(guidance.generatedAt)}
            </span>
          </div>

          {/* Message */}
          <p className="text-sm leading-relaxed font-serif" style={{ color: "var(--ink)" }}>
            {guidance.message}
          </p>

          {/* Emotional check */}
          {guidance.emotionalCheck && (
            <p className="text-xs italic leading-relaxed" style={{ color: "var(--ink-mid)" }}>
              {guidance.emotionalCheck}
            </p>
          )}

          {/* Suggested actions */}
          {guidance.suggestedActions.length > 0 && (
            <div className="space-y-1.5">
              <p
                className="text-[9px] tracking-[0.2em] uppercase font-semibold"
                style={{ color: ACCENT }}
              >
                Possible next steps
              </p>
              <ul className="space-y-1">
                {guidance.suggestedActions.map((action, i) => (
                  <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                    <span style={{ color: ACCENT }}>✦</span>
                    <span>{action}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Time estimate */}
          {guidance.timeEstimate && (
            <p className="text-xs" style={{ color: "var(--ink-light)" }}>
              ⏱ {guidance.timeEstimate}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              onClick={() => onRequestGuidance("overwhelmed")}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-75 disabled:opacity-50"
              style={{
                background: "var(--parchment)",
                border: "1px solid var(--border)",
                color: "var(--ink-mid)",
                borderRadius: "6px",
              }}
            >
              <AlertCircle className="w-3 h-3" />
              I&apos;m overwhelmed
            </button>
            <button
              onClick={() => onRequestGuidance(hour < 12 ? "morning" : "evening")}
              disabled={running}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-opacity hover:opacity-75 disabled:opacity-50"
              style={{
                background: ACCENT_LIGHT,
                color: ACCENT,
                borderRadius: "6px",
                border: `1px solid ${ACCENT}30`,
              }}
            >
              <RefreshCw className="w-3 h-3" />
              {running ? "One moment…" : hour < 12 ? "Morning step" : "Evening check-in"}
            </button>
          </div>
        </div>
      )}

      {/* ── Decide later queue ────────────────────────────────────── */}
      <div className="space-y-2">
        <div className="h-px" style={{ background: "var(--border)" }} />
        <p
          className="text-[9px] tracking-[0.2em] uppercase font-semibold"
          style={{ color: ACCENT }}
        >
          Decide later
        </p>
        <p className="text-xs leading-relaxed" style={{ color: "var(--ink-light)" }}>
          Not sure about something? Park it here — no decision needed now.
        </p>

        {/* Input */}
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. Dad's workshop tools"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            className="flex-1 px-3 py-1.5 text-xs focus:outline-none"
            style={{
              background: "var(--parchment)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              color: "var(--ink)",
            }}
          />
          <button
            onClick={handleAdd}
            disabled={!input.trim()}
            aria-label="Add to decide later"
            className="px-2 py-1.5 transition-opacity hover:opacity-75 disabled:opacity-40"
            style={{
              background: ACCENT_LIGHT,
              color: ACCENT,
              borderRadius: "6px",
              border: `1px solid ${ACCENT}30`,
            }}
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Queue list */}
        {decideLaterItems.length > 0 ? (
          <ul className="space-y-1">
            {decideLaterItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between gap-2 px-3 py-1.5"
                style={{
                  background: "var(--parchment)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                }}
              >
                <span
                  className="text-xs flex-1 min-w-0 truncate"
                  style={{ color: "var(--ink-mid)" }}
                >
                  {item.name}
                </span>
                <button
                  onClick={() => onRemoveDecideLater(item.id)}
                  aria-label={`Remove ${item.name} from decide later`}
                  className="shrink-0 transition-opacity hover:opacity-75"
                  style={{ color: "var(--ink-light)" }}
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs italic" style={{ color: "var(--ink-light)" }}>
            Nothing parked yet.
          </p>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import type { LabNote, LabAssistantResult } from "@/lib/types";

const ACCENT = "#2d5f8a";
const ACCENT_LIGHT = "#dde6f0";

function timeAgo(date: Date): string {
  const diff = Date.now() - date.getTime();
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor(diff / 60_000);
  if (h > 23) return `${Math.floor(h / 24)}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return "just now";
}

function DataRow({ label, value }: { label: string; value: string | number | boolean | undefined | null }) {
  if (value === undefined || value === null || value === "") return null;
  const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  return (
    <div className="flex gap-2 text-xs leading-relaxed">
      <span className="shrink-0 font-medium" style={{ color: ACCENT, minWidth: 80 }}>{label}</span>
      <span style={{ color: "var(--ink-mid)" }}>{display}</span>
    </div>
  );
}

function RecordSection({ title, data }: { title: string; data: Record<string, string> }) {
  const entries = Object.entries(data).filter(([, v]) => v);
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: ACCENT }}>
        {title}
      </p>
      {entries.map(([k, v]) => (
        <DataRow key={k} label={k} value={v} />
      ))}
    </div>
  );
}

function LabNoteCard({ note, onDismiss }: { note: LabNote; onDismiss: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const hasSpecs = Object.keys(note.specifications ?? {}).length > 0;
  const hasConditions = Object.keys(note.testConditions ?? {}).length > 0;
  const hasVariables = note.variables?.changed || note.variables?.constant || note.variables?.reason;
  const hasResults = note.results?.vsExpected || note.results?.vsPrevious || note.results?.vsGoal || note.results?.metric;

  return (
    <div
      className="flex flex-col"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "6px",
        background: "var(--parchment)",
      }}
    >
      {/* Header row */}
      <div className="flex items-start gap-2 px-3 py-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            {note.category && (
              <span
                className="text-[9px] font-semibold tracking-[0.12em] uppercase px-1.5 py-0.5"
                style={{ background: ACCENT_LIGHT, color: ACCENT, borderRadius: "3px" }}
              >
                {note.category}
              </span>
            )}
            {note.results?.success === true && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5" style={{ background: "#d1fae5", color: "#065f46", borderRadius: "3px" }}>
                Pass
              </span>
            )}
            {note.results?.success === false && (
              <span className="text-[9px] font-semibold px-1.5 py-0.5" style={{ background: "#fee2e2", color: "#991b1b", borderRadius: "3px" }}>
                Fail
              </span>
            )}
          </div>
          <p className="text-sm font-semibold mt-0.5 leading-tight" style={{ color: "var(--ink)" }}>
            {note.itemName}
          </p>
          {(note.brand || note.source) && (
            <p className="text-[10px] mt-0.5" style={{ color: "var(--ink-light)" }}>
              {[note.brand, note.source].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          <button
            onClick={() => setExpanded((e) => !e)}
            className="p-1 transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-light)" }}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onDismiss}
            className="p-1 transition-opacity hover:opacity-60"
            style={{ color: "var(--ink-light)" }}
            aria-label="Dismiss"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Observations preview (always visible) */}
      {note.observations && (
        <div className="px-3 pb-2.5">
          <p className="text-xs leading-relaxed" style={{ color: "var(--ink-mid)" }}>
            {note.observations}
          </p>
        </div>
      )}

      {/* Expanded detail */}
      {expanded && (
        <div
          className="px-3 pb-3 space-y-3"
          style={{ borderTop: "1px solid var(--border)" }}
        >
          <div className="pt-3 space-y-3">
            {/* Core identifiers */}
            <div className="space-y-1">
              {note.batchLot && <DataRow label="Batch/lot" value={note.batchLot} />}
              {note.testDate && <DataRow label="Test date" value={note.testDate} />}
              {note.purchaseDate && <DataRow label="Purchased" value={note.purchaseDate} />}
              {note.cost !== undefined && note.cost !== null && <DataRow label="Cost" value={`$${note.cost}`} />}
            </div>

            {hasSpecs && <RecordSection title="Specifications" data={note.specifications} />}
            {hasConditions && <RecordSection title="Test conditions" data={note.testConditions} />}

            {hasVariables && (
              <div className="space-y-1">
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: ACCENT }}>
                  Variables
                </p>
                {note.variables.changed && <DataRow label="Changed" value={note.variables.changed} />}
                {note.variables.constant && <DataRow label="Constant" value={note.variables.constant} />}
                {note.variables.reason && <DataRow label="Why" value={note.variables.reason} />}
              </div>
            )}

            {hasResults && (
              <div className="space-y-1">
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: ACCENT }}>
                  Results
                </p>
                {note.results.metric && <DataRow label="Metric" value={note.results.metric} />}
                {note.results.vsExpected && <DataRow label="vs expected" value={note.results.vsExpected} />}
                {note.results.vsPrevious && <DataRow label="vs previous" value={note.results.vsPrevious} />}
                {note.results.vsGoal && <DataRow label="vs goal" value={note.results.vsGoal} />}
              </div>
            )}

            {note.analysis && (
              <div className="space-y-1">
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: ACCENT }}>
                  Analysis
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                  {note.analysis}
                </p>
              </div>
            )}

            {note.nextSteps && note.nextSteps.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: ACCENT }}>
                  Next steps
                </p>
                <ul className="space-y-1">
                  {note.nextSteps.map((step, i) => (
                    <li key={i} className="flex gap-2 text-xs leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                      <span style={{ color: ACCENT }}>→</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {note.relatedItems && note.relatedItems.length > 0 && (
              <div className="space-y-1">
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: ACCENT }}>
                  Related items
                </p>
                <div className="flex flex-wrap gap-1">
                  {note.relatedItems.map((item, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5"
                      style={{ background: ACCENT_LIGHT, color: ACCENT, borderRadius: "4px" }}
                    >
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface LabAssistantPanelProps {
  result: LabAssistantResult | null;
  running: boolean;
  onRun: () => void;
  onDismiss: (noteId: string) => void;
}

export function LabAssistantPanel({ result, running, onRun, onDismiss }: LabAssistantPanelProps) {
  const visibleNotes = (result?.notes ?? []).filter((n) => !n.dismissed);
  const dismissedCount = (result?.notes ?? []).filter((n) => n.dismissed).length;

  return (
    <div className="mt-3 space-y-4">
      <div className="h-px" style={{ background: "var(--border)" }} />

      {/* Run button + last-run timestamp */}
      <div className="flex items-center justify-between gap-2">
        <div>
          {result?.lastRunAt && (
            <p className="text-[10px]" style={{ color: "var(--ink-light)" }}>
              Last run {timeAgo(result.lastRunAt)}
              {dismissedCount > 0 && ` · ${dismissedCount} dismissed`}
            </p>
          )}
        </div>
        <button
          onClick={onRun}
          disabled={running}
          className="px-4 py-1.5 text-xs font-semibold transition-opacity hover:opacity-75 disabled:opacity-50"
          style={{
            background: ACCENT_LIGHT,
            color: ACCENT,
            borderRadius: "6px",
            border: `1px solid ${ACCENT}30`,
          }}
        >
          {running ? "Analyzing…" : result ? "Re-run analysis" : "Run analysis"}
        </button>
      </div>

      {/* Notes */}
      {visibleNotes.length > 0 ? (
        <div className="space-y-2">
          <p
            className="text-[9px] tracking-[0.2em] uppercase font-semibold"
            style={{ color: ACCENT }}
          >
            Lab notes · {visibleNotes.length}
          </p>
          {visibleNotes.map((note) => (
            <LabNoteCard key={note.id} note={note} onDismiss={() => onDismiss(note.id)} />
          ))}
        </div>
      ) : result ? (
        <p className="text-xs italic" style={{ color: "var(--ink-light)" }}>
          No lab-relevant items found — add items with material specs, test conditions, or experimental notes.
        </p>
      ) : (
        <p className="text-xs italic" style={{ color: "var(--ink-light)" }}>
          Run an analysis to extract structured lab notes from your inventory.
        </p>
      )}
    </div>
  );
}

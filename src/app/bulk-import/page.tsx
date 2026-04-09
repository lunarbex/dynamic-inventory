"use client";

import { useState, useRef, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { Header } from "@/components/layout/Header";
import { LoginForm } from "@/components/auth/LoginForm";
import { addItem, getInventoryItems } from "@/lib/firestore";
import { uploadPhotos } from "@/lib/storage";
import type { ActivityZoneId } from "@/lib/types";
import {
  Upload, X, Check, Loader2, AlertCircle, ChevronDown, ChevronUp,
  FileText, Image as ImageIcon, Download,
} from "lucide-react";
import toast from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

// ── Constants ─────────────────────────────────────────────────────────────────
const ANALYSIS_CONCURRENCY = 5;
const MAX_PHOTOS = 500;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ExtractedItem {
  id: string;
  name: string;
  brand: string;
  description: string;
  categories: ActivityZoneId[];
  visibleText: string;
  modelOrSku: string;
  tags: string[];
  microLocation: string;
  macroLocation: string;
  photoFile: File;
  photoPreviewUrl: string;
  status: "pending" | "analyzing" | "ready" | "error" | "saved";
  error?: string;
  selected: boolean;
}

// ── Simple CSV parser ──────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { headers: [], rows: [] };

  function parseLine(line: string): string[] {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        result.push(current.trim()); current = "";
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  }

  const headers = parseLine(lines[0]);
  const rows = lines.slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const values = parseLine(line);
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
    });
  return { headers, rows };
}

const COLUMN_ALIASES: Record<string, string[]> = {
  name: ["name", "item", "title", "object", "item name"],
  description: ["description", "desc", "notes", "details"],
  story: ["story", "narrative", "history", "background"],
  microLocation: ["location", "micro location", "storage", "spot", "where", "room"],
  macroLocation: ["city", "region", "macro location", "macro", "place"],
  tags: ["tags", "labels", "keywords", "categories"],
  brand: ["brand", "manufacturer", "maker"],
  condition: ["condition", "state", "quality"],
  passTo: ["pass to", "inherit", "recipient", "give to"],
};

function autoMapColumn(header: string): string | null {
  const normalized = header.toLowerCase().trim();
  for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
    if (aliases.some((a) => normalized.includes(a))) return field;
  }
  return null;
}

// ── CSV export helper ──────────────────────────────────────────────────────────

function escapeCsv(val: unknown): string {
  const s = val == null ? "" : String(val);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCsvString(headers: string[], rows: string[][]): string {
  return [headers, ...rows].map((r) => r.map(escapeCsv).join(",")).join("\n");
}

function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Photo Import Tab ───────────────────────────────────────────────────────────

function PhotoImportTab({
  items, setItems, onSaveAll, saving, batchName,
}: {
  items: ExtractedItem[];
  setItems: React.Dispatch<React.SetStateAction<ExtractedItem[]>>;
  onSaveAll: () => void;
  saving: boolean;
  batchName: string;
}) {
  const fileInputId = useId();
  const dropRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [commonLocation, setCommonLocation] = useState("");
  const [commonTags, setCommonTags] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const analyzeItem = useCallback(async (item: ExtractedItem, setItemsFn: React.Dispatch<React.SetStateAction<ExtractedItem[]>>) => {
    setItemsFn((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "analyzing" } : i));
    try {
      const form = new FormData();
      form.append("image", item.photoFile, item.photoFile.name);
      const res = await fetch("/api/analyze-photo", { method: "POST", body: form });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();
      const extracted = data.items?.[0];
      if (!extracted) throw new Error("No items detected");

      setItemsFn((prev) => prev.map((i) =>
        i.id === item.id ? {
          ...i,
          name: extracted.name ?? "",
          brand: extracted.brand ?? "",
          description: extracted.description ?? "",
          categories: extracted.categories ?? [],
          visibleText: extracted.visibleText ?? "",
          modelOrSku: extracted.modelOrSku ?? "",
          tags: extracted.tags ?? [],
          status: "ready",
        } : i
      ));
    } catch {
      setItemsFn((prev) => prev.map((i) =>
        i.id === item.id ? { ...i, status: "error", error: "Could not analyze photo" } : i
      ));
    }
  }, []);

  const handleFiles = useCallback(async (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_PHOTOS);
    if (imageFiles.length === 0) { toast.error("No image files found"); return; }
    if (files.length > MAX_PHOTOS) {
      toast(`Loaded first ${MAX_PHOTOS} photos (limit per batch)`, { duration: 4000 });
    }
    if (imageFiles.length > 50) {
      toast(`Processing ${imageFiles.length} photos — items will appear as they're ready`, { duration: 5000, icon: "⚡" });
    }

    const newItems: ExtractedItem[] = imageFiles.map((file) => ({
      id: uuidv4(),
      name: "",
      brand: "",
      description: "",
      categories: [],
      visibleText: "",
      modelOrSku: "",
      tags: [],
      microLocation: "",
      macroLocation: "",
      photoFile: file,
      photoPreviewUrl: URL.createObjectURL(file),
      status: "pending" as const,
      selected: true,
    }));

    setItems((prev) => [...prev, ...newItems]);

    // Process in parallel batches
    for (let i = 0; i < newItems.length; i += ANALYSIS_CONCURRENCY) {
      const batch = newItems.slice(i, i + ANALYSIS_CONCURRENCY);
      await Promise.all(batch.map((item) => analyzeItem(item, setItems)));
    }
  }, [setItems, analyzeItem]);

  function applyCommonData() {
    const loc = commonLocation.trim();
    const tags = commonTags.split(",").map((t) => t.trim()).filter(Boolean);
    setItems((prev) => prev.map((i) => ({
      ...i,
      microLocation: loc || i.microLocation,
      tags: tags.length > 0 ? [...new Set([...i.tags, ...tags])] : i.tags,
    })));
    if (loc || tags.length > 0) toast.success("Applied to all items");
  }

  const selectedCount = items.filter((i) => i.selected && i.status === "ready").length;
  const analyzingCount = items.filter((i) => i.status === "analyzing" || i.status === "pending").length;
  const savedCount = items.filter((i) => i.status === "saved").length;

  return (
    <div className="space-y-5">
      {/* Drop zone */}
      <div
        ref={dropRef}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)); }}
        className="relative flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed transition-colors cursor-pointer"
        style={{
          borderColor: dragging ? "var(--gold)" : "var(--border)",
          background: dragging ? "var(--parchment-dark)" : "var(--parchment)",
        }}
        onClick={() => document.getElementById(fileInputId)?.click()}
      >
        <ImageIcon className="w-8 h-8" style={{ color: "var(--ink-light)" }} />
        <div className="text-center">
          <p className="text-sm font-medium" style={{ color: "var(--ink-mid)" }}>Drop photos here or click to browse</p>
          <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>JPG, PNG, WEBP — up to {MAX_PHOTOS} photos per batch</p>
        </div>
        <input
          id={fileInputId}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(Array.from(e.target.files ?? []))}
        />
      </div>

      {items.length > 0 && (
        <>
          {/* Common data */}
          <div className="p-4 rounded-xl space-y-3" style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}>
            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>Apply to all items</p>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--ink-mid)" }}>Location</label>
                <input
                  value={commonLocation}
                  onChange={(e) => setCommonLocation(e.target.value)}
                  placeholder="e.g. Studio shelf 2"
                  className="w-full text-xs px-2.5 py-1.5 focus:outline-none"
                  style={{ background: "var(--parchment)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: "6px" }}
                />
              </div>
              <div>
                <label className="text-xs mb-1 block" style={{ color: "var(--ink-mid)" }}>Tags (comma-separated)</label>
                <input
                  value={commonTags}
                  onChange={(e) => setCommonTags(e.target.value)}
                  placeholder="e.g. art supplies, 2024"
                  className="w-full text-xs px-2.5 py-1.5 focus:outline-none"
                  style={{ background: "var(--parchment)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: "6px" }}
                />
              </div>
            </div>
            <button
              onClick={applyCommonData}
              className="text-xs px-3 py-1.5 font-medium transition-opacity hover:opacity-75"
              style={{ background: "var(--parchment-dark)", border: "1px solid var(--border)", color: "var(--ink-mid)", borderRadius: "6px" }}
            >
              Apply to all
            </button>
          </div>

          {/* Item list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>
                {items.length} photo{items.length !== 1 ? "s" : ""}
                {analyzingCount > 0 && <span style={{ color: "var(--gold)" }}> · analyzing {analyzingCount}…</span>}
                {savedCount > 0 && <span className="text-emerald-600"> · {savedCount} saved</span>}
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setItems((prev) => prev.map((i) => ({ ...i, selected: i.status === "ready" })))}
                  className="text-[10px] transition-opacity hover:opacity-70"
                  style={{ color: "var(--ink-light)" }}
                >
                  Select all ready
                </button>
                <button
                  onClick={() => setItems([])}
                  className="text-[10px] transition-opacity hover:opacity-70"
                  style={{ color: "var(--ink-light)" }}
                >
                  Clear all
                </button>
              </div>
            </div>

            {items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl overflow-hidden"
                style={{ border: "1px solid var(--border)", background: "var(--parchment-light)", opacity: item.status === "error" ? 0.6 : 1 }}
              >
                {/* Row header */}
                <div className="flex items-center gap-3 p-3">
                  <button
                    onClick={() => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, selected: !i.selected } : i))}
                    disabled={item.status !== "ready"}
                    className="shrink-0 w-4 h-4 rounded border flex items-center justify-center transition-colors"
                    style={{
                      border: `1.5px solid ${item.selected && item.status === "ready" ? "var(--gold)" : "var(--border)"}`,
                      background: item.selected && item.status === "ready" ? "var(--gold)" : "transparent",
                    }}
                  >
                    {item.selected && item.status === "ready" && <Check className="w-2.5 h-2.5 text-white" />}
                  </button>

                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.photoPreviewUrl} alt="" className="shrink-0 object-cover rounded-lg" style={{ width: 48, height: 48 }} />

                  <div className="flex-1 min-w-0">
                    {item.status === "analyzing" && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--gold)" }} />
                        <p className="text-xs" style={{ color: "var(--ink-mid)" }}>Reading photo…</p>
                      </div>
                    )}
                    {item.status === "pending" && (
                      <p className="text-xs" style={{ color: "var(--ink-light)" }}>Queued…</p>
                    )}
                    {item.status === "error" && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-red-400" />
                        <p className="text-xs text-red-500">{item.error}</p>
                      </div>
                    )}
                    {(item.status === "ready" || item.status === "saved") && (
                      <div>
                        <p className="text-sm font-semibold leading-snug truncate" style={{ color: "var(--ink)" }}>{item.name || "Unnamed item"}</p>
                        {item.brand && <p className="text-xs truncate" style={{ color: "var(--ink-mid)" }}>{item.brand}</p>}
                      </div>
                    )}
                    {item.status === "saved" && (
                      <span className="text-[10px] text-emerald-600 font-semibold">✓ Saved</span>
                    )}
                  </div>

                  {item.status === "ready" && (
                    <button
                      onClick={() => setExpanded(expanded === item.id ? null : item.id)}
                      className="shrink-0 p-1 transition-opacity hover:opacity-70"
                      style={{ color: "var(--ink-light)" }}
                    >
                      {expanded === item.id ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  )}
                  <button
                    onClick={() => setItems((prev) => prev.filter((i) => i.id !== item.id))}
                    className="shrink-0 p-1 transition-opacity hover:opacity-70"
                    style={{ color: "var(--ink-light)" }}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expanded edit form */}
                {expanded === item.id && item.status === "ready" && (
                  <div className="px-3 pb-3 pt-0 space-y-2 border-t" style={{ borderColor: "var(--border)" }}>
                    <div className="pt-2 grid grid-cols-2 gap-2">
                      {([
                        { label: "Name", field: "name" as const },
                        { label: "Brand", field: "brand" as const },
                        { label: "Micro location", field: "microLocation" as const },
                        { label: "Macro location", field: "macroLocation" as const },
                      ]).map(({ label, field }) => (
                        <div key={field}>
                          <label className="text-[10px] mb-0.5 block uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>{label}</label>
                          <input
                            value={item[field]}
                            onChange={(e) => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, [field]: e.target.value } : i))}
                            className="w-full text-xs px-2 py-1.5 focus:outline-none"
                            style={{ background: "var(--parchment)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: "5px" }}
                          />
                        </div>
                      ))}
                    </div>
                    <div>
                      <label className="text-[10px] mb-0.5 block uppercase tracking-wider" style={{ color: "var(--ink-light)" }}>Description</label>
                      <input
                        value={item.description}
                        onChange={(e) => setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, description: e.target.value } : i))}
                        className="w-full text-xs px-2 py-1.5 focus:outline-none"
                        style={{ background: "var(--parchment)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: "5px" }}
                      />
                    </div>
                    {item.visibleText && (
                      <p className="text-[10px] italic" style={{ color: "var(--ink-light)" }}>
                        Visible text: {item.visibleText}
                      </p>
                    )}
                    {item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, i) => (
                          <span key={i} className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "var(--parchment-dark)", color: "var(--ink-mid)" }}>
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Save button — available as soon as any items are ready */}
          {selectedCount > 0 && (
            <button
              onClick={onSaveAll}
              disabled={saving}
              className="w-full py-3 font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: "var(--gold)", color: "var(--parchment-light)", borderRadius: "10px" }}
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Saving…</span>
              ) : analyzingCount > 0 ? (
                `Save ${selectedCount} ready item${selectedCount !== 1 ? "s" : ""} · ${analyzingCount} still analyzing`
              ) : (
                `Save ${selectedCount} item${selectedCount !== 1 ? "s" : ""}${batchName ? ` to "${batchName}"` : ""}`
              )}
            </button>
          )}
          {selectedCount === 0 && analyzingCount > 0 && (
            <p className="text-xs text-center" style={{ color: "var(--ink-light)" }}>
              Analyzing {analyzingCount} photo{analyzingCount !== 1 ? "s" : ""}… items will appear when ready
            </p>
          )}
        </>
      )}
    </div>
  );
}

// ── CSV Import Tab ─────────────────────────────────────────────────────────────

interface CsvRow {
  id: string;
  raw: Record<string, string>;
  selected: boolean;
}

function CsvImportTab({ onSaveCsv, saving }: { onSaveCsv: (rows: CsvRow[], mapping: Record<string, string>) => void; saving: boolean }) {
  const fileInputId = useId();
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"upload" | "map" | "preview">("upload");

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { headers: h, rows: r } = parseCSV(text);
      if (h.length === 0) { toast.error("Could not parse CSV"); return; }
      setHeaders(h);
      setRows(r.map((raw) => ({ id: uuidv4(), raw, selected: true })));
      const autoMap: Record<string, string> = {};
      h.forEach((header) => {
        const field = autoMapColumn(header);
        if (field) autoMap[header] = field;
      });
      setMapping(autoMap);
      setStep("map");
    };
    reader.readAsText(file);
  }

  const FIELD_OPTIONS = [
    { value: "", label: "— Ignore —" },
    { value: "name", label: "Item Name" },
    { value: "description", label: "Description" },
    { value: "story", label: "Story" },
    { value: "microLocation", label: "Location (micro)" },
    { value: "macroLocation", label: "Location (city/region)" },
    { value: "tags", label: "Tags" },
    { value: "brand", label: "Brand" },
    { value: "condition", label: "Condition" },
    { value: "passTo", label: "Pass To" },
  ];

  const previewRows = rows.slice(0, 5);
  const selectedCount = rows.filter((r) => r.selected).length;

  return (
    <div className="space-y-5">
      {step === "upload" && (
        <div
          className="flex flex-col items-center justify-center gap-3 py-10 rounded-xl border-2 border-dashed cursor-pointer transition-colors"
          style={{ borderColor: "var(--border)", background: "var(--parchment)" }}
          onClick={() => document.getElementById(fileInputId)?.click()}
        >
          <FileText className="w-8 h-8" style={{ color: "var(--ink-light)" }} />
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: "var(--ink-mid)" }}>Drop CSV file here or click to browse</p>
            <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>UTF-8 CSV with header row</p>
          </div>
          <input id={fileInputId} type="file" accept=".csv,text/csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        </div>
      )}

      {step === "map" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Map columns</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-light)" }}>{rows.length} rows — assign each column to a field</p>
            </div>
            <button onClick={() => setStep("upload")} className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--ink-light)" }}>
              Upload different file
            </button>
          </div>

          <div className="space-y-2">
            {headers.map((header) => (
              <div key={header} className="flex items-center justify-between gap-3 py-2 px-3 rounded-lg" style={{ background: "var(--parchment-light)", border: "1px solid var(--border)" }}>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: "var(--ink)" }}>{header}</p>
                  {rows[0]?.raw[header] && (
                    <p className="text-[10px] truncate mt-0.5 italic" style={{ color: "var(--ink-light)" }}>e.g. {rows[0].raw[header]}</p>
                  )}
                </div>
                <select
                  value={mapping[header] ?? ""}
                  onChange={(e) => setMapping((prev) => ({ ...prev, [header]: e.target.value }))}
                  className="text-xs px-2 py-1 focus:outline-none shrink-0"
                  style={{ background: "var(--parchment)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: "5px" }}
                >
                  {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={() => setStep("preview")}
            disabled={!Object.values(mapping).includes("name")}
            className="w-full py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
            style={{ background: "var(--gold)", color: "var(--parchment-light)", borderRadius: "8px" }}
          >
            Preview import →
          </button>
          {!Object.values(mapping).includes("name") && (
            <p className="text-xs text-center" style={{ color: "var(--ink-light)" }}>Map at least one column to "Item Name" to continue</p>
          )}
        </div>
      )}

      {step === "preview" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Preview</p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-light)" }}>Showing first 5 of {rows.length} rows</p>
            </div>
            <button onClick={() => setStep("map")} className="text-xs transition-opacity hover:opacity-70" style={{ color: "var(--ink-light)" }}>
              ← Back
            </button>
          </div>

          <div className="space-y-2">
            {previewRows.map((row) => {
              const nameCol = Object.entries(mapping).find(([, v]) => v === "name")?.[0];
              const descCol = Object.entries(mapping).find(([, v]) => v === "description")?.[0];
              const locCol = Object.entries(mapping).find(([, v]) => v === "microLocation")?.[0];
              return (
                <div key={row.id} className="p-3 rounded-lg" style={{ background: "var(--parchment-light)", border: "1px solid var(--border)" }}>
                  <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>{nameCol ? row.raw[nameCol] : "(no name)"}</p>
                  {descCol && row.raw[descCol] && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: "var(--ink-mid)" }}>{row.raw[descCol]}</p>}
                  {locCol && row.raw[locCol] && <p className="text-[10px] mt-1" style={{ color: "var(--ink-light)" }}>📍 {row.raw[locCol]}</p>}
                </div>
              );
            })}
          </div>

          <button
            onClick={() => onSaveCsv(rows, mapping)}
            disabled={saving || selectedCount === 0}
            className="w-full py-3 font-semibold text-sm transition-opacity hover:opacity-80 disabled:opacity-50"
            style={{ background: "var(--gold)", color: "var(--parchment-light)", borderRadius: "10px" }}
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Importing…</span>
            ) : (
              `Import ${selectedCount} item${selectedCount !== 1 ? "s" : ""}`
            )}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Export Tab ────────────────────────────────────────────────────────────────

function ExportTab({ inventoryId, inventoryName }: { inventoryId: string; inventoryName: string }) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const items = await getInventoryItems(inventoryId);
      if (items.length === 0) { toast.error("No items to export"); return; }

      const headers = [
        "name", "description", "story", "provenance", "brand",
        "microLocation", "macroLocation", "originPlace",
        "categories", "tags", "condition", "passTo", "isLoanable",
        "addedBy", "addedAt",
      ];

      const rows = items.map((item) => [
        item.name,
        item.description,
        item.story,
        item.provenance,
        item.labData?.brand ?? "",
        item.microLocation,
        item.macroLocation,
        item.originPlace?.name ?? "",
        item.categories.join(";"),
        (item.tags ?? []).join(";"),
        item.condition,
        item.passTo,
        item.isLoanable ? "yes" : "no",
        item.addedByName || item.addedByEmail,
        item.addedAt instanceof Date ? item.addedAt.toISOString().slice(0, 10) : "",
      ]);

      const csv = buildCsvString(headers, rows);
      const filename = `${inventoryName.replace(/[^a-z0-9]/gi, "_").toLowerCase()}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      downloadCsv(filename, csv);
      toast.success(`Exported ${items.length} items`);
    } catch {
      toast.error("Export failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-xl space-y-4" style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}>
        <div>
          <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>Export to CSV</p>
          <p className="text-xs mt-1" style={{ color: "var(--ink-mid)" }}>
            Download all items in <strong>{inventoryName}</strong> as a spreadsheet. Useful for insurance, sharing with family, or backup.
          </p>
        </div>
        <p className="text-xs" style={{ color: "var(--ink-light)" }}>
          Includes: name, description, story, locations, categories, tags, condition, who it passes to, and more.
        </p>
        <button
          onClick={handleExport}
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
          style={{ background: "var(--gold)", color: "var(--parchment-light)", borderRadius: "8px" }}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          {loading ? "Preparing export…" : "Download CSV"}
        </button>
      </div>

      <div className="p-4 rounded-xl" style={{ border: "1px dashed var(--border)", background: "var(--parchment)" }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--ink-light)" }}>Tip</p>
        <p className="text-xs" style={{ color: "var(--ink-mid)" }}>
          You can re-import this CSV file into another inventory using the CSV Import tab above.
          The column mapping will auto-detect the standard fields.
        </p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function BulkImportPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { currentInventory } = useInventoryContext();
  const router = useRouter();

  const [tab, setTab] = useState<"photos" | "csv" | "export">("photos");
  const [photoItems, setPhotoItems] = useState<ExtractedItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [batchName, setBatchName] = useState("");

  if (!authLoading && !user) return <LoginForm />;

  async function handleSavePhotos() {
    if (!user || !currentInventory) { toast.error("No inventory selected"); return; }
    const toSave = photoItems.filter((i) => i.selected && i.status === "ready");
    if (toSave.length === 0) return;

    setSaving(true);
    const batchId = uuidv4();
    let saved = 0;
    let failed = 0;

    // Save with progress — items appear in inventory as they save
    for (const item of toSave) {
      try {
        const photoUrls = await uploadPhotos([item.photoFile], user.uid);
        await addItem({
          inventoryId: currentInventory.id,
          name: item.name || "Unnamed item",
          description: item.description,
          story: "",
          provenance: "",
          categories: item.categories.length > 0 ? item.categories : ["other"],
          microLocation: item.microLocation,
          macroLocation: item.macroLocation,
          originPlace: { name: "" },
          photos: photoUrls,
          voiceTranscript: "",
          passTo: "",
          isLoanable: false,
          condition: "",
          tags: item.tags,
          addedBy: user.uid,
          addedByEmail: user.email ?? "",
          addedByName: user.displayName || user.email?.split("@")[0] || "",
          confirmationMode: "auto",
          collectionId: null,
          isCollection: false,
          importSource: "bulk-photo",
          importBatchId: batchId,
        });
        setPhotoItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "saved" } : i));
        saved++;
      } catch {
        setPhotoItems((prev) => prev.map((i) => i.id === item.id ? { ...i, status: "error", error: "Save failed" } : i));
        failed++;
      }
    }

    setSaving(false);
    if (saved > 0) toast.success(`${saved} item${saved !== 1 ? "s" : ""} added${batchName ? ` to "${batchName}"` : ""}`);
    if (failed > 0) toast.error(`${failed} item${failed !== 1 ? "s" : ""} failed to save`);
    if (failed === 0 && saved > 0) {
      setTimeout(() => router.push("/"), 1200);
    }
  }

  async function handleSaveCsv(rows: CsvRow[], mapping: Record<string, string>) {
    if (!user || !currentInventory) { toast.error("No inventory selected"); return; }

    const selected = rows.filter((r) => r.selected);
    if (selected.length === 0) return;

    setSaving(true);
    const batchId = uuidv4();
    const fieldFor = (row: Record<string, string>, fieldName: string): string => {
      const col = Object.entries(mapping).find(([, v]) => v === fieldName)?.[0];
      return col ? (row[col] ?? "") : "";
    };

    let saved = 0;
    let failed = 0;

    for (const row of selected) {
      try {
        const tagsRaw = fieldFor(row.raw, "tags");
        const tags = tagsRaw ? tagsRaw.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [];

        await addItem({
          inventoryId: currentInventory.id,
          name: fieldFor(row.raw, "name") || "Unnamed item",
          description: fieldFor(row.raw, "description"),
          story: fieldFor(row.raw, "story"),
          provenance: "",
          categories: ["other"],
          microLocation: fieldFor(row.raw, "microLocation"),
          macroLocation: fieldFor(row.raw, "macroLocation"),
          originPlace: { name: "" },
          photos: [],
          voiceTranscript: "",
          passTo: fieldFor(row.raw, "passTo"),
          isLoanable: false,
          condition: fieldFor(row.raw, "condition"),
          tags,
          addedBy: user.uid,
          addedByEmail: user.email ?? "",
          addedByName: user.displayName || user.email?.split("@")[0] || "",
          confirmationMode: "auto",
          collectionId: null,
          isCollection: false,
          importSource: "csv",
          importBatchId: batchId,
        });
        saved++;
      } catch {
        failed++;
      }
    }

    setSaving(false);
    if (saved > 0) toast.success(`${saved} item${saved !== 1 ? "s" : ""} imported${batchName ? ` to "${batchName}"` : ""}`);
    if (failed > 0) toast.error(`${failed} row${failed !== 1 ? "s" : ""} failed`);
    if (failed === 0 && saved > 0) {
      setTimeout(() => router.push("/"), 1200);
    }
  }

  const TABS = [
    { id: "photos" as const, Icon: ImageIcon, label: "Photos", desc: "AI reads each photo" },
    { id: "csv" as const, Icon: FileText, label: "CSV", desc: "From a spreadsheet" },
    { id: "export" as const, Icon: Download, label: "Export", desc: "Download as CSV" },
  ];

  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-xs mb-4 flex items-center gap-1 transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-light)" }}
          >
            ← Back
          </button>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-xl font-bold" style={{ color: "var(--ink)" }}>Import & Export</h1>
              <p className="text-sm mt-1" style={{ color: "var(--ink-mid)" }}>
                Import multiple items at once, or export your inventory to CSV
              </p>
              {currentInventory && (
                <p className="text-xs mt-1" style={{ color: "var(--ink-light)" }}>
                  Inventory: <span className="font-medium" style={{ color: "var(--ink-mid)" }}>{currentInventory.name}</span>
                </p>
              )}
            </div>
            {/* Batch name field — shown for photo/csv tabs */}
            {tab !== "export" && (
              <div className="shrink-0">
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: "var(--ink-light)" }}>Batch name</label>
                <input
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="e.g. Mom's estate"
                  className="text-xs px-2.5 py-1.5 w-36 focus:outline-none"
                  style={{ background: "var(--parchment-light)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: "6px" }}
                />
              </div>
            )}
          </div>
        </div>

        {!currentInventory && (
          <div className="py-12 text-center">
            <p className="text-sm" style={{ color: "var(--ink-mid)" }}>Select an inventory first</p>
          </div>
        )}

        {currentInventory && (
          <>
            {/* Tabs */}
            <div className="flex border-b mb-6" style={{ borderColor: "var(--border)" }}>
              {TABS.map(({ id, Icon, label, desc }) => (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className="flex items-center gap-1.5 px-4 py-3 text-xs border-b-2 transition-colors"
                  style={{
                    borderColor: tab === id ? "var(--gold)" : "transparent",
                    color: tab === id ? "var(--gold)" : "var(--ink-light)",
                    fontWeight: tab === id ? 600 : 400,
                  }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {label}
                  <span className="ml-0.5 hidden sm:inline opacity-60">{desc}</span>
                </button>
              ))}
            </div>

            {tab === "photos" && (
              <PhotoImportTab
                items={photoItems}
                setItems={setPhotoItems}
                onSaveAll={handleSavePhotos}
                saving={saving}
                batchName={batchName}
              />
            )}
            {tab === "csv" && (
              <CsvImportTab onSaveCsv={handleSaveCsv} saving={saving} />
            )}
            {tab === "export" && (
              <ExportTab inventoryId={currentInventory.id} inventoryName={currentInventory.name} />
            )}
          </>
        )}
      </main>
    </div>
  );
}

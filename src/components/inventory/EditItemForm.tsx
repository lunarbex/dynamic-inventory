"use client";

import { useState, useCallback } from "react";
import toast from "react-hot-toast";
import { updateItem } from "@/lib/firestore";
import { uploadPhotos, deletePhoto } from "@/lib/storage";
import { CategoryPicker } from "./CategoryPicker";
import { TagInput } from "./TagInput";
import { PhotoCapture } from "./PhotoCapture";
import { VoiceRecorder } from "./VoiceRecorder";
import type { InventoryItem, ActivityZoneId, OriginPlace, ItemLabData } from "@/lib/types";
import { X, Loader2, Mic, ChevronDown, ChevronUp, BookOpen, FlaskConical } from "lucide-react";

interface EditItemFormProps {
  item: InventoryItem;
  userId: string;
  userEmail: string;
  onSave: (updated: InventoryItem) => void;
  onCancel: () => void;
}

interface EditState {
  name: string;
  description: string;
  story: string;
  provenance: string;
  categories: ActivityZoneId[];
  microLocation: string;
  macroLocation: string;
  originPlaceName: string;
  passTo: string;
  isLoanable: boolean;
  condition: string;
  voiceTranscript: string;
  tags: string[];
  documentationType: "story" | "lab";
  labData: ItemLabData;
}

async function geocodeClient(name: string): Promise<{ lat: number; lng: number } | null> {
  if (!name.trim()) return null;
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(name)}&format=json&limit=1`,
      { headers: { "User-Agent": "ObjectStories/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {}
  return null;
}

export function EditItemForm({ item, userId, userEmail, onSave, onCancel }: EditItemFormProps) {
  const [fields, setFields] = useState<EditState>({
    name: item.name,
    description: item.description,
    story: item.story,
    provenance: item.provenance,
    categories: [...item.categories],
    microLocation: item.microLocation,
    macroLocation: item.macroLocation,
    originPlaceName: item.originPlace?.name ?? "",
    passTo: item.passTo,
    isLoanable: item.isLoanable,
    condition: item.condition,
    voiceTranscript: item.voiceTranscript,
    tags: [...(item.tags ?? [])],
    documentationType: item.documentationType ?? "story",
    labData: item.labData ?? { specifications: {}, testConditions: {}, observations: "", results: {}, nextSteps: [] },
  });

  // Photos: existing URLs to keep, existing URLs to remove, new File[] to add
  const [keptPhotos, setKeptPhotos] = useState<string[]>([...item.photos]);
  const [removedPhotos, setRemovedPhotos] = useState<string[]>([]);
  const [newPhotoFiles, setNewPhotoFiles] = useState<File[]>([]);
  const [newPhotoPreviewUrls, setNewPhotoPreviewUrls] = useState<string[]>([]);

  const [showReRecord, setShowReRecord] = useState(false);
  const [saving, setSaving] = useState(false);


  function set<K extends keyof EditState>(key: K, value: EditState[K]) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  // ── Photo management ───────────────────────────────────────────────────────

  function removeExisting(url: string) {
    setKeptPhotos((prev) => prev.filter((u) => u !== url));
    setRemovedPhotos((prev) => [...prev, url]);
  }

  function removeNew(index: number) {
    URL.revokeObjectURL(newPhotoPreviewUrls[index]);
    setNewPhotoFiles((prev) => prev.filter((_, i) => i !== index));
    setNewPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Voice re-record ────────────────────────────────────────────────────────

  const handleTranscriptChange = useCallback((t: string) => {
    if (t) set("voiceTranscript", t);
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      // Upload new photos
      let uploadedUrls: string[] = [];
      if (newPhotoFiles.length > 0) {
        uploadedUrls = await uploadPhotos(newPhotoFiles, userId);
      }

      // Delete removed photos from Storage (best-effort)
      await Promise.allSettled(removedPhotos.map((url) => deletePhoto(url)));

      const finalPhotos = [...keptPhotos, ...uploadedUrls];

      // Re-geocode origin place if name changed
      let originPlace: OriginPlace = { name: fields.originPlaceName };
      if (fields.originPlaceName !== item.originPlace?.name) {
        const coords = await geocodeClient(fields.originPlaceName);
        originPlace = { name: fields.originPlaceName, ...(coords ?? {}) };
      } else {
        originPlace = item.originPlace ?? { name: "" };
        originPlace = { ...originPlace, name: fields.originPlaceName };
      }

      const updates: Partial<InventoryItem> = {
        name: fields.name,
        description: fields.description,
        story: fields.story,
        provenance: fields.provenance,
        categories: fields.categories,
        microLocation: fields.microLocation,
        macroLocation: fields.macroLocation,
        originPlace,
        passTo: fields.passTo,
        isLoanable: fields.isLoanable,
        condition: fields.condition,
        voiceTranscript: fields.voiceTranscript,
        tags: fields.tags,
        photos: finalPhotos,
        documentationType: fields.documentationType,
        labData: fields.documentationType === "lab" ? fields.labData : undefined,
      };

      await updateItem(item.id, updates, { uid: userId, email: userEmail });

      onSave({ ...item, ...updates, updatedBy: userId, updatedByEmail: userEmail, updatedAt: new Date() });
      toast.success("Changes saved");
    } catch (err) {
      console.error("[EditItemForm] save failed:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function kv2text(kv: Record<string, string>) {
    return Object.entries(kv).map(([k, v]) => `${k}: ${v}`).join("\n");
  }
  function text2kv(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return result;
  }
  function updateLabData(partial: Partial<ItemLabData>) {
    set("labData", { ...fields.labData, ...partial });
  }

  return (
    <div className="space-y-6">
      {/* Documentation type toggle */}
      <Section title="Documentation style">
        <div className="grid grid-cols-2 gap-2">
          {(["story", "lab"] as const).map((type) => (
            <button key={type} type="button" onClick={() => set("documentationType", type)}
              className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
                fields.documentationType === type
                  ? type === "lab" ? "border-blue-400 bg-blue-50 text-blue-800" : "border-amber-400 bg-amber-50 text-amber-800"
                  : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
              }`}>
              {type === "story"
                ? <BookOpen className={`w-4 h-4 shrink-0 ${fields.documentationType === "story" ? "text-amber-500" : "text-stone-400"}`} />
                : <FlaskConical className={`w-4 h-4 shrink-0 ${fields.documentationType === "lab" ? "text-blue-500" : "text-stone-400"}`} />
              }
              <div>
                <p className="text-sm font-semibold leading-tight">{type === "story" ? "Story" : "Lab Notes"}</p>
                <p className="text-xs opacity-70 leading-tight mt-0.5">{type === "story" ? "Preserve narrative" : "Technical details"}</p>
              </div>
            </button>
          ))}
        </div>
      </Section>

      {/* Core fields */}
      <Section title="Details">
        <Label text="Name" />
        <input value={fields.name} onChange={(e) => set("name", e.target.value)}
          className={inputCls} placeholder="Item name" />

        <Label text="Description" />
        <textarea value={fields.description} onChange={(e) => set("description", e.target.value)}
          rows={2} className={`${inputCls} resize-none`} placeholder="One-sentence description" />
      </Section>

      {/* Photos */}
      <Section title="Photos">
        {/* Existing photos */}
        {keptPhotos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {keptPhotos.map((url) => (
              <div key={url} className="relative aspect-square rounded-xl overflow-hidden bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
                <button onClick={() => removeExisting(url)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
        {/* New photos via camera / gallery */}
        <PhotoCapture
          photos={newPhotoFiles}
          previewUrls={newPhotoPreviewUrls}
          onAddPhotos={(files) => {
            setNewPhotoFiles((prev) => [...prev, ...files]);
            setNewPhotoPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
          }}
          onRemove={removeNew}
        />
      </Section>

      {/* Locations */}
      <Section title="Locations">
        <Label text="Storage spot (micro)" />
        <input value={fields.microLocation} onChange={(e) => set("microLocation", e.target.value)}
          className={inputCls} placeholder="e.g. kitchen drawer 2, closet top shelf" />

        <Label text="City / region (macro)" />
        <input value={fields.macroLocation} onChange={(e) => set("macroLocation", e.target.value)}
          className={inputCls} placeholder="e.g. San Francisco, CA" />

        <Label text="Origin place (where acquired)" />
        <input value={fields.originPlaceName} onChange={(e) => set("originPlaceName", e.target.value)}
          className={inputCls} placeholder="e.g. Portland, OR — will be geocoded on save" />
        {item.originPlace?.lat && fields.originPlaceName === item.originPlace.name && (
          <p className="text-xs text-stone-400 mt-0.5">
            📍 Currently mapped at {item.originPlace.lat.toFixed(3)}, {item.originPlace.lng?.toFixed(3)}
          </p>
        )}
      </Section>

      {/* Story & provenance — story mode only */}
      {fields.documentationType === "story" && (
        <Section title="Story & Provenance">
          <Label text="Story" />
          <textarea value={fields.story} onChange={(e) => set("story", e.target.value)}
            rows={5} className={`${inputCls} resize-none`} placeholder="The full story of this object" />

          <Label text="Provenance" />
          <textarea value={fields.provenance} onChange={(e) => set("provenance", e.target.value)}
            rows={3} className={`${inputCls} resize-none`} placeholder="Origin, history, how it was acquired" />
        </Section>
      )}

      {/* Lab documentation — lab mode only */}
      {fields.documentationType === "lab" && (
        <Section title="Lab Documentation">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label text="Brand" />
              <input value={fields.labData.brand ?? ""} onChange={(e) => updateLabData({ brand: e.target.value })}
                className={inputCls} placeholder="e.g. Winsor & Newton" />
            </div>
            <div>
              <Label text="Batch / Lot" />
              <input value={fields.labData.batchLot ?? ""} onChange={(e) => updateLabData({ batchLot: e.target.value })}
                className={inputCls} placeholder="e.g. B24-1103" />
            </div>
          </div>

          <Label text="Source / Supplier" />
          <input value={fields.labData.source ?? ""} onChange={(e) => updateLabData({ source: e.target.value })}
            className={inputCls} placeholder="e.g. Blick Art Materials" />

          <Label text="Specifications (key: value, one per line)" />
          <textarea value={kv2text(fields.labData.specifications)}
            onChange={(e) => updateLabData({ specifications: text2kv(e.target.value) })}
            rows={3} placeholder={"viscosity: medium\nopacity: transparent"} className={`${inputCls} resize-none font-mono text-xs`} />

          <Label text="Test Conditions (key: value, one per line)" />
          <textarea value={kv2text(fields.labData.testConditions)}
            onChange={(e) => updateLabData({ testConditions: text2kv(e.target.value) })}
            rows={3} placeholder={"temperature: 22°C\nsubstrate: cold press"} className={`${inputCls} resize-none font-mono text-xs`} />

          <Label text="Observations" />
          <textarea value={fields.labData.observations} onChange={(e) => updateLabData({ observations: e.target.value })}
            rows={3} className={`${inputCls} resize-none`} placeholder="What happened objectively" />

          <Label text="Result" />
          <div className="flex gap-2 mb-2">
            {([["true", "✓ Pass", "emerald"], ["false", "✗ Fail", "red"], ["null", "– TBD", "stone"]] as const).map(([val, label, color]) => {
              const current = fields.labData.results?.success;
              const isActive = val === "true" ? current === true : val === "false" ? current === false : current == null;
              return (
                <button key={val} type="button"
                  onClick={() => updateLabData({ results: { ...fields.labData.results, success: val === "true" ? true : val === "false" ? false : undefined } })}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${
                    isActive ? `bg-${color}-100 text-${color}-700` : "bg-stone-100 text-stone-400"
                  }`}>
                  {label}
                </button>
              );
            })}
          </div>
          <input value={fields.labData.results?.metric ?? ""}
            onChange={(e) => updateLabData({ results: { ...fields.labData.results, metric: e.target.value } })}
            className={inputCls} placeholder="What success/failure was measured by" />

          <Label text="Analysis" />
          <textarea value={fields.labData.analysis ?? ""} onChange={(e) => updateLabData({ analysis: e.target.value })}
            rows={2} className={`${inputCls} resize-none`} placeholder="Why did this result occur?" />

          <Label text="Next Steps (one per line)" />
          <textarea value={(fields.labData.nextSteps ?? []).join("\n")}
            onChange={(e) => updateLabData({ nextSteps: e.target.value.split("\n").filter(Boolean) })}
            rows={3} placeholder={"Try with gesso primer\nTest batch B"} className={`${inputCls} resize-none`} />
        </Section>
      )}

      {/* Voice transcript */}
      <Section title="Voice Story">
        <Label text="Transcript" />
        <textarea value={fields.voiceTranscript} onChange={(e) => set("voiceTranscript", e.target.value)}
          rows={4} className={`${inputCls} resize-none`} placeholder="Edit the transcript directly, or re-record below" />

        <button onClick={() => setShowReRecord((v) => !v)}
          className="mt-2 flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 font-medium">
          <Mic className="w-4 h-4" />
          {showReRecord ? "Hide recorder" : "Re-record story"}
          {showReRecord ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {showReRecord && (
          <div className="mt-3 p-4 bg-stone-50 rounded-xl border border-stone-200">
            <p className="text-xs text-stone-400 mb-3">
              New recording will replace the transcript above when stopped
            </p>
            <VoiceRecorder
              onTranscriptChange={handleTranscriptChange}
              onStop={() => setShowReRecord(false)}
              onReset={() => {}}
            />
          </div>
        )}
      </Section>

      {/* Object life — story mode only */}
      {fields.documentationType === "story" && <Section title="Object Life">
        <Label text="Condition" />
        <input value={fields.condition} onChange={(e) => set("condition", e.target.value)}
          className={inputCls} placeholder="e.g. excellent, well-worn, needs repair" />

        <Label text="Pass to" />
        <input value={fields.passTo} onChange={(e) => set("passTo", e.target.value)}
          className={inputCls} placeholder="Who might inherit or receive this?" />

        <Label text="Loanable / shareable" />
        <button type="button" onClick={() => set("isLoanable", !fields.isLoanable)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            fields.isLoanable
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-stone-100 text-stone-500 border border-stone-200"
          }`}>
          {fields.isLoanable ? "✓ Friends can borrow this" : "Not available to borrow"}
        </button>
      </Section>}

      {/* Activity / Type */}
      <Section title="Activity / Type">
        <CategoryPicker selected={fields.categories}
          onChange={(cats) => set("categories", cats)} />
      </Section>

      {/* Tags */}
      <Section title="Tags">
        <p className="text-xs text-stone-400">Custom labels — press Enter or comma to add</p>
        <TagInput tags={fields.tags} onChange={(t) => set("tags", t)} />
      </Section>

      {/* Action buttons */}
      <div className="flex gap-3 pt-2">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold rounded-xl transition-colors">
          {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : "Save changes"}
        </button>
        <button onClick={onCancel} disabled={saving}
          className="px-5 py-3.5 bg-white border border-stone-200 hover:bg-stone-50 text-stone-600 font-medium rounded-xl transition-colors disabled:opacity-50">
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Small helpers ────────────────────────────────────────────────────────────

const inputCls =
  "w-full text-sm text-stone-800 bg-white border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-300";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-stone-400 uppercase tracking-wider">{title}</h3>
      <div className="bg-white border border-stone-200 rounded-2xl p-4 space-y-3">
        {children}
      </div>
    </div>
  );
}

function Label({ text }: { text: string }) {
  return <p className="text-xs font-medium text-stone-500 mt-1 first:mt-0">{text}</p>;
}

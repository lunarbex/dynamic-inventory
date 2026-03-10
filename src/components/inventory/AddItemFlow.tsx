"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { VoiceRecorder } from "./VoiceRecorder";
import { CategoryPicker } from "./CategoryPicker";
import { PhotoCapture } from "./PhotoCapture";
import { TagInput } from "./TagInput";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { addItem } from "@/lib/firestore";
import { uploadPhotos } from "@/lib/storage";
import type { ActivityZoneId, ConfirmationMode, OriginPlace } from "@/lib/types";
import {
  Loader2, ChevronRight, Check, Pencil, Clock,
} from "lucide-react";

type Step = "capture" | "processing" | "review" | "saving";

interface ExtractedState {
  transcript: string;
  name: string;
  description: string;
  categories: ActivityZoneId[];
  microLocation: string;
  macroLocation: string;
  originPlace: OriginPlace;
  story: string;
  provenance: string;
  passTo: string;
  isLoanable: boolean;
  condition: string;
  tags: string[];
}

function emptyExtracted(): ExtractedState {
  return {
    transcript: "",
    name: "",
    description: "",
    categories: [],
    microLocation: "",
    macroLocation: "",
    originPlace: { name: "" },
    story: "",
    provenance: "",
    passTo: "",
    isLoanable: false,
    condition: "",
    tags: [],
  };
}

export function AddItemFlow() {
  const { user } = useAuthContext();
  const router = useRouter();

  const [step, setStep] = useState<Step>("capture");
  const [savingStatus, setSavingStatus] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [recordingStopped, setRecordingStopped] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedState | null>(null);
  const [editing, setEditing] = useState(false);

  // ── Photos ────────────────────────────────────────────────────────────────

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Voice ─────────────────────────────────────────────────────────────────

  const handleTranscriptChange = useCallback((t: string) => setTranscript(t), []);

  function handleVoiceStop() { setRecordingStopped(true); }
  function handleVoiceReset() { setTranscript(""); setRecordingStopped(false); }

  // ── Process ───────────────────────────────────────────────────────────────

  async function processRecording() {
    const text = transcript.trim();
    if (!text) { toast.error("Please add a description first."); return; }

    console.log("[AddItemFlow] processRecording, transcript length:", text.length);
    setStep("processing");

    try {
      const res = await fetch("/api/process-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `API error ${res.status}`);
      }

      const data = await res.json();
      console.log("[AddItemFlow] extracted:", data.extracted);

      setExtracted({
        transcript: text,
        name: data.extracted.name,
        description: data.extracted.description,
        categories: data.extracted.categories,
        microLocation: data.extracted.microLocation,
        macroLocation: data.extracted.macroLocation,
        originPlace: data.extracted.originPlace ?? { name: "" },
        story: data.extracted.story,
        provenance: data.extracted.provenance,
        passTo: data.extracted.passTo,
        isLoanable: data.extracted.isLoanable,
        condition: data.extracted.condition,
        tags: data.extracted.tags ?? [],
      });
      setStep("review");
    } catch (err) {
      console.error("[AddItemFlow] processRecording error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process recording");
      setStep("capture");
    }
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function save(confirmationMode: ConfirmationMode) {
    if (!user || !extracted) return;
    setStep("saving");

    console.log("[AddItemFlow] save() — user:", user.uid);

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        console.log("[AddItemFlow] uploading", photos.length, "photos...");
        setSavingStatus("Uploading photos...");
        photoUrls = await uploadPhotos(photos, user.uid);
        console.log("[AddItemFlow] photos uploaded:", photoUrls.length);
      }

      setSavingStatus("Saving to database...");
      console.log("[AddItemFlow] writing to Firestore...");

      const newId = await addItem({
        name: extracted.name || "Unnamed item",
        description: extracted.description,
        story: extracted.story,
        provenance: extracted.provenance,
        categories: extracted.categories.length > 0 ? extracted.categories : ["other"],
        microLocation: extracted.microLocation,
        macroLocation: extracted.macroLocation,
        originPlace: extracted.originPlace,
        photos: photoUrls,
        voiceTranscript: extracted.transcript,
        passTo: extracted.passTo,
        isLoanable: extracted.isLoanable,
        condition: extracted.condition,
        tags: extracted.tags,
        addedBy: user.uid,
        addedByEmail: user.email ?? "",
        confirmationMode,
      });

      console.log("[AddItemFlow] saved! id:", newId);
      toast.success("Item added to your inventory!");
      router.push("/");
    } catch (err) {
      console.error("[AddItemFlow] save() FAILED:", err);
      toast.error(err instanceof Error ? err.message : "Failed to save item");
      setSavingStatus("");
      setStep("review");
    }
  }

  // ── Loading screens ───────────────────────────────────────────────────────

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-stone-700 font-medium">Claude is reading your story...</p>
        <p className="text-stone-400 text-sm">Extracting details, location, and provenance</p>
      </div>
    );
  }

  if (step === "saving") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-stone-700 font-medium">Saving to your inventory...</p>
        {savingStatus && <p className="text-stone-400 text-sm">{savingStatus}</p>}
      </div>
    );
  }

  // ── Review screen ─────────────────────────────────────────────────────────

  if (step === "review" && extracted) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-stone-800">Review & Confirm</h2>
          <p className="text-stone-500 text-sm mt-0.5">Here&apos;s what Claude extracted from your story</p>
        </div>

        {photoPreviewUrls.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {photoPreviewUrls.map((url, i) => (
              <div key={i} className="flex-shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-stone-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-4">
          <Field label="Item Name" value={extracted.name} editing={editing}
            onChange={(v) => setExtracted((p) => p && ({ ...p, name: v }))} />
          <Field label="Description" value={extracted.description} editing={editing} multiline
            onChange={(v) => setExtracted((p) => p && ({ ...p, description: v }))} />

          {/* Location section */}
          <div className="space-y-3 pt-1 border-t border-amber-200">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Locations</p>
            <Field label="Storage spot (micro)" value={extracted.microLocation} editing={editing}
              placeholder="e.g. kitchen drawer 2, closet top shelf"
              onChange={(v) => setExtracted((p) => p && ({ ...p, microLocation: v }))} />
            <Field label="City / region (macro)" value={extracted.macroLocation} editing={editing}
              placeholder="e.g. San Francisco, CA"
              onChange={(v) => setExtracted((p) => p && ({ ...p, macroLocation: v }))} />
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Origin place</p>
              {editing ? (
                <input type="text" value={extracted.originPlace.name}
                  onChange={(e) => setExtracted((p) => p && ({ ...p, originPlace: { ...p.originPlace, name: e.target.value } }))}
                  placeholder="e.g. Portland, OR or market in Oaxaca"
                  className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400" />
              ) : (
                <div>
                  <p className="text-sm text-stone-800">
                    {extracted.originPlace.name || <span className="text-stone-400 italic">Not detected</span>}
                  </p>
                  {extracted.originPlace.lat && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      📍 {extracted.originPlace.lat.toFixed(4)}, {extracted.originPlace.lng?.toFixed(4)} (geocoded)
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Story & provenance */}
          <div className="space-y-3 pt-1 border-t border-amber-200">
            <Field label="Story" value={extracted.story} editing={editing} multiline
              onChange={(v) => setExtracted((p) => p && ({ ...p, story: v }))} />
            <Field label="Provenance" value={extracted.provenance} editing={editing} multiline
              onChange={(v) => setExtracted((p) => p && ({ ...p, provenance: v }))} />
          </div>

          {/* Social fields */}
          <div className="space-y-3 pt-1 border-t border-amber-200">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Object life</p>
            <Field label="Condition" value={extracted.condition} editing={editing}
              placeholder="e.g. excellent, well-worn, needs repair"
              onChange={(v) => setExtracted((p) => p && ({ ...p, condition: v }))} />
            <Field label="Pass to" value={extracted.passTo} editing={editing}
              placeholder="Who might inherit or receive this?"
              onChange={(v) => setExtracted((p) => p && ({ ...p, passTo: v }))} />
            <div>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Loanable / shareable</p>
              {editing ? (
                <button
                  type="button"
                  onClick={() => setExtracted((p) => p && ({ ...p, isLoanable: !p.isLoanable }))}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    extracted.isLoanable
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-stone-100 text-stone-500"
                  }`}
                >
                  {extracted.isLoanable ? "✓ Friends can borrow" : "Not available to borrow"}
                </button>
              ) : (
                <p className="text-sm text-stone-800">
                  {extracted.isLoanable ? "✓ Friends can borrow this" : "Not available to borrow"}
                </p>
              )}
            </div>
          </div>

          {/* Categories */}
          <div className="pt-1 border-t border-amber-200">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Categories</p>
            {editing ? (
              <CategoryPicker selected={extracted.categories}
                onChange={(cats) => setExtracted((p) => p && ({ ...p, categories: cats }))} />
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {extracted.categories.map((cat) => (
                  <span key={cat} className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full">{cat}</span>
                ))}
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="pt-1 border-t border-amber-200">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Tags</p>
            <p className="text-xs text-stone-400 mb-2">Suggested by Claude — add, remove, or keep as-is</p>
            <TagInput
              tags={extracted.tags}
              onChange={(tags) => setExtracted((p) => p && ({ ...p, tags }))}
            />
          </div>
        </div>

        <details className="text-sm">
          <summary className="text-stone-400 cursor-pointer select-none hover:text-stone-600">View original transcript</summary>
          <p className="mt-2 text-stone-500 italic leading-relaxed pl-2 border-l-2 border-stone-200">{extracted.transcript}</p>
        </details>

        {/* Three confirmation options */}
        <div className="space-y-2">
          <button onClick={() => save("auto")}
            className="w-full flex items-center justify-between px-5 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
              <Check className="w-5 h-5" />
              <div className="text-left">
                <p className="font-semibold text-sm">Looks great, save it</p>
                <p className="text-emerald-100 text-xs">Won&apos;t ask to review for 30–50 entries</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-60 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button onClick={() => save("ask")}
            className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl transition-colors group">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-stone-400" />
              <div className="text-left">
                <p className="font-semibold text-sm">Good, but ask next time</p>
                <p className="text-stone-400 text-xs">Always show review before saving</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-0.5 transition-transform" />
          </button>

          <button onClick={() => setEditing(true)} disabled={editing}
            className="w-full flex items-center justify-between px-5 py-4 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 rounded-xl transition-colors group disabled:opacity-40">
            <div className="flex items-center gap-3">
              <Pencil className="w-5 h-5 text-stone-400" />
              <div className="text-left">
                <p className="font-semibold text-sm">Let me adjust</p>
                <p className="text-stone-400 text-xs">Edit any of the extracted fields above</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40 group-hover:translate-x-0.5 transition-transform" />
          </button>

          {editing && (
            <button onClick={() => save("manual")}
              className="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors">
              Save edited version
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Capture screen ────────────────────────────────────────────────────────

  const hasTranscript = transcript.trim().length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-stone-800">Add an Object</h2>
        <p className="text-stone-500 text-sm mt-0.5">
          Pick up the object, photograph it, then tell its story
        </p>
      </div>

      {/* Photos */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Photos</h3>
        <PhotoCapture
          photos={photos}
          previewUrls={photoPreviewUrls}
          onAddPhotos={(files) => {
            setPhotos((prev) => [...prev, ...files]);
            setPhotoPreviewUrls((prev) => [...prev, ...files.map((f) => URL.createObjectURL(f))]);
          }}
          onRemove={removePhoto}
        />
      </section>

      {/* Voice */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Tell the Story</h3>
        <p className="text-xs text-stone-400">
          Speak naturally — what it is, where it&apos;s from, where you keep it, who might inherit it, whether friends can borrow it
        </p>
        <VoiceRecorder onTranscriptChange={handleTranscriptChange} onStop={handleVoiceStop} onReset={handleVoiceReset} />

        {recordingStopped && (
          <div className="space-y-1.5 mt-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500">
                {hasTranscript ? "Transcript (edit if needed)" : "No transcript captured — type your description"}
              </p>
              {hasTranscript && <span className="text-xs text-emerald-600 font-medium">✓ Ready</span>}
            </div>
            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
              placeholder="Describe the object: what it is, where it's from, where you keep it, its story, who might inherit it..."
              rows={5}
              className="w-full text-sm bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
        )}
      </section>

      {/* Submit */}
      <div className="space-y-2">
        <button onClick={processRecording} disabled={!hasTranscript}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white font-semibold rounded-xl transition-colors text-base">
          Process with Claude →
        </button>
        {!recordingStopped && (
          <p className="text-center text-xs text-stone-400">Record yourself describing the object to continue</p>
        )}
        {recordingStopped && !hasTranscript && (
          <p className="text-center text-xs text-stone-400">Type a description above to continue</p>
        )}
      </div>
    </div>
  );
}

// ── Reusable field editor ─────────────────────────────────────────────────────

function Field({
  label, value, editing, multiline, placeholder, onChange,
}: {
  label: string; value: string; editing: boolean;
  multiline?: boolean; placeholder?: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">{label}</p>
      {editing ? (
        multiline ? (
          <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={3} placeholder={placeholder}
            className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder-stone-300" />
        ) : (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
            className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-300" />
        )
      ) : (
        <p className="text-sm text-stone-800 leading-relaxed">
          {value || <span className="text-stone-400 italic">Not detected</span>}
        </p>
      )}
    </div>
  );
}

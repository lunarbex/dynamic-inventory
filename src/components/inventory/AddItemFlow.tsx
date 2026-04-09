"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { VoiceRecorder } from "./VoiceRecorder";
import { CategoryPicker } from "./CategoryPicker";
import { PhotoCapture } from "./PhotoCapture";
import { TagInput } from "./TagInput";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { addItem } from "@/lib/firestore";
import { uploadPhotos, uploadAudio } from "@/lib/storage";
import type { ActivityZoneId, ConfirmationMode, OriginPlace, ItemLabData } from "@/lib/types";
import {
  Loader2, ChevronRight, Check, Pencil, Clock, Sparkles, BookOpen, FlaskConical,
} from "lucide-react";

type Step = "capture" | "transcribing" | "processing" | "analyzing-photo" | "review" | "saving";
type DocType = "story" | "lab";

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
  labData?: ItemLabData;
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
  const { currentInventory } = useInventoryContext();
  const router = useRouter();

  // Default doc type based on inventory mode
  const defaultDocType: DocType = currentInventory?.mode === "professional" ? "lab" : "story";

  const [step, setStep] = useState<Step>("capture");
  const [savingStatus, setSavingStatus] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviewUrls, setPhotoPreviewUrls] = useState<string[]>([]);
  const [transcript, setTranscript] = useState("");
  const [recordingStopped, setRecordingStopped] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcribeError, setTranscribeError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedState | null>(null);
  const [editing, setEditing] = useState(false);
  const [importSource, setImportSource] = useState<"manual" | "quick-photo">("manual");
  const [docType, setDocType] = useState<DocType>(defaultDocType);

  // ── Photos ────────────────────────────────────────────────────────────────

  function removePhoto(index: number) {
    URL.revokeObjectURL(photoPreviewUrls[index]);
    setPhotos((prev) => prev.filter((_, i) => i !== index));
    setPhotoPreviewUrls((prev) => prev.filter((_, i) => i !== index));
  }

  // ── Voice ─────────────────────────────────────────────────────────────────

  const handleTranscriptChange = useCallback((t: string) => setTranscript(t), []);

  const handleAudioReady = useCallback(async (blob: Blob) => {
    setAudioBlob(blob);
  }, []);

  function handleVoiceStop() {
    setRecordingStopped(true);
  }

  function handleVoiceReset() {
    setTranscript("");
    setRecordingStopped(false);
    setAudioBlob(null);
    setTranscribeError(null);
  }

  // ── Quick Add: analyze photo ──────────────────────────────────────────────

  async function analyzePhoto() {
    if (photos.length === 0) { toast.error("Add a photo first."); return; }
    setStep("analyzing-photo");
    try {
      const form = new FormData();
      form.append("image", photos[0], photos[0].name);
      const res = await fetch("/api/analyze-photo", { method: "POST", body: form });
      if (!res.ok) throw new Error("Photo analysis failed");
      const data = await res.json();
      const item = data.items?.[0];
      if (!item) throw new Error("No items detected in photo");

      setImportSource("quick-photo");
      setExtracted({
        transcript: "",
        name: item.name ?? "",
        description: item.description ?? "",
        categories: item.categories ?? [],
        microLocation: "",
        macroLocation: "",
        originPlace: { name: "" },
        story: "",
        provenance: "",
        passTo: "",
        isLoanable: false,
        condition: "",
        tags: item.tags ?? [],
      });
      setStep("review");
    } catch (err) {
      console.error("[AddItemFlow] analyzePhoto error:", err);
      toast.error(err instanceof Error ? err.message : "Photo analysis failed");
      setStep("capture");
    }
  }

  async function transcribeAudio(blob: Blob) {
    setTranscribeError(null);
    setStep("transcribing");
    try {
      const form = new FormData();
      form.append("audio", blob, "recording.webm");
      const res = await fetch("/api/transcribe-audio", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Transcription failed (${res.status})`);
      if (data.transcript?.trim()) {
        setTranscript(data.transcript.trim());
      } else {
        setTranscribeError("No speech detected in the recording. Please type your description below.");
      }
    } catch (err) {
      console.error("[AddItemFlow] transcribeAudio error:", err);
      setTranscribeError(
        err instanceof Error ? err.message : "Transcription failed — please type your description below."
      );
    } finally {
      setStep("capture");
    }
  }

  // ── Process (story mode) ──────────────────────────────────────────────────

  async function processStoryRecording() {
    const text = transcript.trim();
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
      console.error("[AddItemFlow] processStoryRecording error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process recording");
      setStep("capture");
    }
  }

  // ── Process (lab mode) ────────────────────────────────────────────────────

  async function processLabRecording() {
    const text = transcript.trim();
    setStep("processing");
    try {
      const res = await fetch("/api/process-lab-recording", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: text }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? `API error ${res.status}`);
      }

      const data = await res.json();
      const e = data.extracted;

      setExtracted({
        transcript: text,
        name: e.name ?? "",
        description: e.description ?? "",
        categories: e.categories ?? [],
        microLocation: e.microLocation ?? "",
        macroLocation: e.macroLocation ?? "",
        originPlace: e.originPlace ?? { name: "" },
        story: "",
        provenance: "",
        passTo: "",
        isLoanable: false,
        condition: "",
        tags: e.tags ?? [],
        labData: e.labData,
      });
      setStep("review");
    } catch (err) {
      console.error("[AddItemFlow] processLabRecording error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to process recording");
      setStep("capture");
    }
  }

  function processRecording() {
    const text = transcript.trim();
    if (!text) {
      // No transcript — skip AI processing, go straight to manual review form
      setExtracted(emptyExtracted());
      setEditing(true);
      setStep("review");
      return;
    }
    return docType === "lab" ? processLabRecording() : processStoryRecording();
  }

  // ── Save ─────────────────────────────────────────────────────────────────

  async function save(confirmationMode: ConfirmationMode) {
    if (!user || !extracted) return;
    if (!currentInventory) {
      toast.error("No inventory selected. Please go back and select one.");
      return;
    }
    setStep("saving");

    try {
      let photoUrls: string[] = [];
      if (photos.length > 0) {
        setSavingStatus("Uploading photos...");
        photoUrls = await uploadPhotos(photos, user.uid);
      }

      let audioUrl: string | undefined;
      if (audioBlob) {
        setSavingStatus("Saving voice recording...");
        try {
          audioUrl = await uploadAudio(audioBlob, user.uid);
        } catch (err) {
          console.warn("[AddItemFlow] audio upload failed (non-fatal):", err);
        }
      }

      setSavingStatus("Saving to database...");

      const newId = await addItem({
        inventoryId: currentInventory.id,
        name: extracted.name || "Unnamed item",
        description: extracted.description,
        story: extracted.story,
        provenance: extracted.provenance,
        categories: extracted.categories.length > 0 ? extracted.categories : ["other"],
        microLocation: extracted.microLocation,
        macroLocation: extracted.macroLocation,
        originPlace: extracted.originPlace,
        photos: photoUrls,
        audioUrl,
        voiceTranscript: extracted.transcript,
        passTo: extracted.passTo,
        isLoanable: extracted.isLoanable,
        condition: extracted.condition,
        tags: extracted.tags,
        addedBy: user.uid,
        addedByEmail: user.email ?? "",
        addedByName: user.displayName || user.email?.split("@")[0] || "",
        confirmationMode,
        collectionId: null,
        isCollection: false,
        importSource,
        documentationType: docType,
        processedBy: docType === "lab" ? "lab_assistant" : "story_listener",
        labData: docType === "lab" ? extracted.labData : undefined,
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

  if (step === "transcribing") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-stone-700 font-medium">Transcribing your recording…</p>
        <p className="text-stone-400 text-sm">This usually takes a few seconds</p>
      </div>
    );
  }

  if (step === "processing") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-stone-700 font-medium">
          {docType === "lab" ? "Lab Assistant is reading your notes…" : "Claude is reading your story..."}
        </p>
        <p className="text-stone-400 text-sm">
          {docType === "lab" ? "Extracting specs, conditions, and results" : "Extracting details, location, and provenance"}
        </p>
      </div>
    );
  }

  if (step === "analyzing-photo") {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-amber-500 animate-spin" />
        <p className="text-stone-700 font-medium">Reading photo…</p>
        <p className="text-stone-400 text-sm">Extracting item details from the image</p>
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
          <div className="flex items-center gap-2 mb-1">
            {docType === "lab"
              ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">🔬 Lab Notes</span>
              : <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">📖 Story</span>
            }
          </div>
          <h2 className="text-lg font-semibold text-stone-800">Review & Confirm</h2>
          <p className="text-stone-500 text-sm mt-0.5">
            {importSource === "quick-photo"
              ? "Here's what Claude read from your photo — add a voice story or save as-is"
              : docType === "lab"
              ? "Here's what Lab Assistant extracted from your recording"
              : "Here's what Claude extracted from your story"}
          </p>
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

          {/* Location */}
          <div className="space-y-3 pt-1 border-t border-amber-200">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Locations</p>
            <Field label="Storage spot (micro)" value={extracted.microLocation} editing={editing}
              placeholder="e.g. studio shelf 2, drawer B"
              onChange={(v) => setExtracted((p) => p && ({ ...p, microLocation: v }))} />
            <Field label="City / region (macro)" value={extracted.macroLocation} editing={editing}
              placeholder="e.g. San Francisco, CA"
              onChange={(v) => setExtracted((p) => p && ({ ...p, macroLocation: v }))} />
          </div>

          {docType === "lab" ? (
            /* ── Lab-specific fields ── */
            <LabReviewFields
              labData={extracted.labData}
              editing={editing}
              onChange={(ld) => setExtracted((p) => p && ({ ...p, labData: ld }))}
            />
          ) : (
            /* ── Story-specific fields ── */
            <>
              <div className="space-y-3 pt-1 border-t border-amber-200">
                <Field label="Story" value={extracted.story} editing={editing} multiline
                  onChange={(v) => setExtracted((p) => p && ({ ...p, story: v }))} />
                <Field label="Provenance" value={extracted.provenance} editing={editing} multiline
                  onChange={(v) => setExtracted((p) => p && ({ ...p, provenance: v }))} />
              </div>

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
                    <button type="button"
                      onClick={() => setExtracted((p) => p && ({ ...p, isLoanable: !p.isLoanable }))}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        extracted.isLoanable ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"
                      }`}>
                      {extracted.isLoanable ? "✓ Friends can borrow" : "Not available to borrow"}
                    </button>
                  ) : (
                    <p className="text-sm text-stone-800">
                      {extracted.isLoanable ? "✓ Friends can borrow this" : "Not available to borrow"}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Categories */}
          <div className="pt-1 border-t border-amber-200">
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-2">Activity / Type</p>
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
            <TagInput
              tags={extracted.tags}
              onChange={(tags) => setExtracted((p) => p && ({ ...p, tags }))}
            />
          </div>
        </div>

        {extracted.transcript && (
          <details className="text-sm">
            <summary className="text-stone-400 cursor-pointer select-none hover:text-stone-600">View original transcript</summary>
            <p className="mt-2 text-stone-500 italic leading-relaxed pl-2 border-l-2 border-stone-200">{extracted.transcript}</p>
          </details>
        )}

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
          Pick up the object, photograph it, then describe it
        </p>
      </div>

      {/* ── Documentation style ── */}
      <section className="space-y-2">
        <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">Documentation style</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setDocType("story")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
              docType === "story"
                ? "border-amber-400 bg-amber-50 text-amber-800"
                : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
            }`}
          >
            <BookOpen className={`w-4 h-4 shrink-0 ${docType === "story" ? "text-amber-500" : "text-stone-400"}`} />
            <div>
              <p className="text-sm font-semibold leading-tight">Story</p>
              <p className="text-xs opacity-70 leading-tight mt-0.5">Preserve narrative</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setDocType("lab")}
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 text-left transition-colors ${
              docType === "lab"
                ? "border-blue-400 bg-blue-50 text-blue-800"
                : "border-stone-200 bg-white text-stone-500 hover:border-stone-300"
            }`}
          >
            <FlaskConical className={`w-4 h-4 shrink-0 ${docType === "lab" ? "text-blue-500" : "text-stone-400"}`} />
            <div>
              <p className="text-sm font-semibold leading-tight">Lab Notes</p>
              <p className="text-xs opacity-70 leading-tight mt-0.5">Technical details</p>
            </div>
          </button>
        </div>
      </section>

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

        {photos.length > 0 && (
          <div className="flex flex-col gap-2 pt-1">
            <button
              onClick={analyzePhoto}
              className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl transition-colors border-2 border-dashed border-amber-300 hover:border-amber-400 hover:bg-amber-50 text-amber-700"
            >
              <Sparkles className="w-4 h-4" />
              Quick Add — analyze photo
            </button>
            <p className="text-center text-xs text-stone-400">
              Skips voice — AI reads the photo and pre-fills the form
            </p>
          </div>
        )}
      </section>

      {/* Voice / Text */}
      <section className="space-y-3">
        <h3 className="text-sm font-medium text-stone-500 uppercase tracking-wider">
          {docType === "lab" ? "Describe your test or material" : "Tell the Story"}
        </h3>
        <p className="text-xs text-stone-400">
          {docType === "lab"
            ? "Describe what you tested, how, what happened, and what you observed. Be specific — brand, batch, conditions, results."
            : "Speak naturally — what it is, where it's from, where you keep it, who might inherit it, whether friends can borrow it"}
        </p>
        <VoiceRecorder
          onTranscriptChange={handleTranscriptChange}
          onAudioReady={handleAudioReady}
          onStop={handleVoiceStop}
          onReset={handleVoiceReset}
        />

        {recordingStopped && (
          <div className="space-y-2 mt-2">
            {transcribeError && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                {transcribeError}
              </div>
            )}

            {!hasTranscript && !transcribeError && audioBlob && (
              <div className="bg-stone-50 border border-stone-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <p className="text-sm text-stone-500">
                  Live transcription unavailable — transcribe automatically or type below.
                </p>
                <button
                  onClick={() => transcribeAudio(audioBlob)}
                  className="shrink-0 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Transcribe
                </button>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-stone-500">
                {hasTranscript ? "Transcript (edit if needed)" : "Type your description"}
              </p>
              {hasTranscript && <span className="text-xs text-emerald-600 font-medium">✓ Ready</span>}
            </div>
            <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)}
              placeholder={
                docType === "lab"
                  ? "Describe the material or test: what you used, how you tested it, what conditions, what happened..."
                  : "Describe the object: what it is, where it's from, where you keep it, its story, who might inherit it..."
              }
              rows={5}
              className="w-full text-sm bg-white border border-stone-200 rounded-xl px-3 py-2.5 text-stone-800 placeholder-stone-300 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
          </div>
        )}
      </section>

      {/* Submit */}
      <div className="space-y-2">
        <button onClick={processRecording}
          className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl transition-colors text-base">
          {hasTranscript ? "Continue →" : photos.length > 0 ? "Save photo item →" : "Enter details manually →"}
        </button>
        {!hasTranscript && (
          <p className="text-center text-xs text-stone-400">
            {photos.length > 0
              ? "Use Quick Add above to auto-fill from the photo, or continue to enter details manually"
              : "Voice and photo are both optional — continue to fill in details manually"}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Lab review fields ─────────────────────────────────────────────────────────

function LabReviewFields({
  labData, editing, onChange,
}: {
  labData?: ItemLabData;
  editing: boolean;
  onChange: (ld: ItemLabData) => void;
}) {
  const ld = labData ?? {
    specifications: {}, testConditions: {}, observations: "", results: {}, nextSteps: [],
  };

  function update(partial: Partial<ItemLabData>) {
    onChange({ ...ld, ...partial });
  }

  // Convert Record<string,string> to "key: value\n..." for textarea
  function kv2text(kv: Record<string, string>) {
    return Object.entries(kv).map(([k, v]) => `${k}: ${v}`).join("\n");
  }
  function text2kv(text: string): Record<string, string> {
    const result: Record<string, string> = {};
    for (const line of text.split("\n")) {
      const idx = line.indexOf(":");
      if (idx > 0) {
        result[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
      }
    }
    return result;
  }

  return (
    <div className="space-y-4 pt-1 border-t border-amber-200">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider">Lab Documentation</p>

      {/* Brand + Batch */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Brand</p>
          {editing ? (
            <input type="text" value={ld.brand ?? ""} onChange={(e) => update({ brand: e.target.value })}
              placeholder="e.g. Winsor & Newton"
              className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-300" />
          ) : (
            <p className="text-sm text-stone-800">{ld.brand || <span className="text-stone-400 italic">–</span>}</p>
          )}
        </div>
        <div>
          <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Batch / Lot</p>
          {editing ? (
            <input type="text" value={ld.batchLot ?? ""} onChange={(e) => update({ batchLot: e.target.value })}
              placeholder="e.g. B24-1103"
              className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-300" />
          ) : (
            <p className="text-sm text-stone-800">{ld.batchLot || <span className="text-stone-400 italic">–</span>}</p>
          )}
        </div>
      </div>

      {/* Specifications */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Specifications</p>
        {editing ? (
          <>
            <textarea
              value={kv2text(ld.specifications)}
              onChange={(e) => update({ specifications: text2kv(e.target.value) })}
              placeholder={"viscosity: medium\nopacity: transparent\npigment load: high"}
              rows={3}
              className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder-stone-300" />
            <p className="text-[10px] text-stone-400 mt-0.5">One "key: value" per line</p>
          </>
        ) : (
          <div className="space-y-0.5">
            {Object.entries(ld.specifications).length > 0
              ? Object.entries(ld.specifications).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-stone-400 shrink-0 w-28">{k}</span>
                    <span className="text-stone-800">{v}</span>
                  </div>
                ))
              : <span className="text-stone-400 italic text-sm">None extracted</span>
            }
          </div>
        )}
      </div>

      {/* Test conditions */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Test Conditions</p>
        {editing ? (
          <>
            <textarea
              value={kv2text(ld.testConditions)}
              onChange={(e) => update({ testConditions: text2kv(e.target.value) })}
              placeholder={"temperature: 22°C\nsubstrate: cold press\ndilution: 1:2 water"}
              rows={3}
              className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder-stone-300" />
            <p className="text-[10px] text-stone-400 mt-0.5">One "key: value" per line</p>
          </>
        ) : (
          <div className="space-y-0.5">
            {Object.entries(ld.testConditions).length > 0
              ? Object.entries(ld.testConditions).map(([k, v]) => (
                  <div key={k} className="flex gap-2 text-sm">
                    <span className="text-stone-400 shrink-0 w-28">{k}</span>
                    <span className="text-stone-800">{v}</span>
                  </div>
                ))
              : <span className="text-stone-400 italic text-sm">None extracted</span>
            }
          </div>
        )}
      </div>

      {/* Observations */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Observations</p>
        {editing ? (
          <textarea value={ld.observations} onChange={(e) => update({ observations: e.target.value })}
            rows={3} placeholder="What happened objectively during the test"
            className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder-stone-300" />
        ) : (
          <p className="text-sm text-stone-800 leading-relaxed">
            {ld.observations || <span className="text-stone-400 italic">None extracted</span>}
          </p>
        )}
      </div>

      {/* Results */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Results</p>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button type="button" onClick={() => update({ results: { ...ld.results, success: true } })}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${ld.results?.success === true ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-400"}`}>
                  ✓ Pass
                </button>
                <button type="button" onClick={() => update({ results: { ...ld.results, success: false } })}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${ld.results?.success === false ? "bg-red-100 text-red-700" : "bg-stone-100 text-stone-400"}`}>
                  ✗ Fail
                </button>
                <button type="button" onClick={() => update({ results: { ...ld.results, success: undefined } })}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg transition-colors ${ld.results?.success == null ? "bg-amber-100 text-amber-700" : "bg-stone-100 text-stone-400"}`}>
                  – TBD
                </button>
              </>
            ) : (
              ld.results?.success === true
                ? <span className="text-xs font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">✓ Pass</span>
                : ld.results?.success === false
                ? <span className="text-xs font-semibold px-2 py-0.5 bg-red-100 text-red-700 rounded-full">✗ Fail</span>
                : <span className="text-xs font-semibold px-2 py-0.5 bg-stone-100 text-stone-400 rounded-full">– TBD</span>
            )}
          </div>
          {editing ? (
            <input type="text" value={ld.results?.metric ?? ""} placeholder="What success/failure was measured by"
              onChange={(e) => update({ results: { ...ld.results, metric: e.target.value } })}
              className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-300" />
          ) : ld.results?.metric ? (
            <p className="text-sm text-stone-700">{ld.results.metric}</p>
          ) : null}
        </div>
      </div>

      {/* Analysis */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Analysis</p>
        {editing ? (
          <textarea value={ld.analysis ?? ""} onChange={(e) => update({ analysis: e.target.value })}
            rows={2} placeholder="Why did this result occur?"
            className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder-stone-300" />
        ) : (
          <p className="text-sm text-stone-800 leading-relaxed">
            {ld.analysis || <span className="text-stone-400 italic">None extracted</span>}
          </p>
        )}
      </div>

      {/* Next steps */}
      <div>
        <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mb-1">Next Steps</p>
        {editing ? (
          <>
            <textarea
              value={(ld.nextSteps ?? []).join("\n")}
              onChange={(e) => update({ nextSteps: e.target.value.split("\n").filter(Boolean) })}
              rows={3} placeholder={"Try with gesso primer\nTest batch B at higher dilution"}
              className="w-full text-sm text-stone-800 bg-white border border-amber-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none placeholder-stone-300" />
            <p className="text-[10px] text-stone-400 mt-0.5">One step per line</p>
          </>
        ) : (
          <ul className="space-y-1">
            {(ld.nextSteps ?? []).length > 0
              ? ld.nextSteps!.map((s, i) => (
                  <li key={i} className="text-sm text-stone-800 flex gap-2">
                    <span className="text-stone-400 shrink-0">{i + 1}.</span> {s}
                  </li>
                ))
              : <span className="text-stone-400 italic text-sm">None</span>
            }
          </ul>
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

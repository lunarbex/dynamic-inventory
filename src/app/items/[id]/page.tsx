"use client";

export const dynamic = "force-dynamic";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { getItem, deleteItem, updateItem } from "@/lib/firestore";
import type { InventoryItem, ActivityZoneId } from "@/lib/types";
import { ACTIVITY_ZONES } from "@/lib/types";
import { CategoryPicker } from "@/components/inventory/CategoryPicker";
import { TagInput } from "@/components/inventory/TagInput";
import { EditItemForm } from "@/components/inventory/EditItemForm";
import {
  ArrowLeft, ChevronLeft, ChevronRight, Archive,
  Navigation, Heart, Pencil, Trash2, Share2, Play, Pause, FlaskConical, BookOpen,
} from "lucide-react";
import toast from "react-hot-toast";

// Tag colors — same palette as ItemCard
const TAG_PALETTE = [
  { bg: "#f0e8d0", color: "#6b4010" },
  { bg: "#deebd6", color: "#30561e" },
  { bg: "#dde8e4", color: "#1e5040" },
  { bg: "#ecdde4", color: "#661830" },
  { bg: "#e2ddf0", color: "#342070" },
];
function tagStyle(tag: string) {
  const idx = [...tag].reduce((acc, c) => acc + c.charCodeAt(0), 0) % TAG_PALETTE.length;
  return TAG_PALETTE[idx];
}

export default function ItemDetailPage() {
  const { user, loading: authLoading } = useAuthContext();
  const params = useParams();
  const router = useRouter();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [deleting, setDeleting] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editingCategories, setEditingCategories] = useState(false);
  const [savingCategories, setSavingCategories] = useState(false);
  const [draftCategories, setDraftCategories] = useState<ActivityZoneId[]>([]);
  const [editingTags, setEditingTags] = useState(false);
  const [savingTags, setSavingTags] = useState(false);
  const [draftTags, setDraftTags] = useState<string[]>([]);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [copied, setCopied] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const id = params.id as string;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      if (!cancelled) { setLoading(false); setFetchError(true); }
    }, 10_000);
    getItem(id)
      .then((data) => { if (!cancelled) setItem(data); })
      .catch(() => { if (!cancelled) setFetchError(true); })
      .finally(() => { if (!cancelled) { clearTimeout(timeout); setLoading(false); } });
    return () => { cancelled = true; clearTimeout(timeout); };
  }, [id]);

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
        <Header />
        <main className="max-w-xl mx-auto px-6 py-8">
          <div className="h-3 w-28 rounded animate-pulse mb-8" style={{ background: "var(--parchment-dark)" }} />
          <div className="h-8 w-2/3 rounded animate-pulse mb-3" style={{ background: "var(--parchment-dark)" }} />
          <div className="h-4 w-1/2 rounded animate-pulse mb-8" style={{ background: "var(--parchment-dark)" }} />
          <div className="aspect-[4/3] rounded-sm animate-pulse mb-8" style={{ background: "var(--parchment-dark)" }} />
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-4 rounded animate-pulse" style={{ background: "var(--parchment-dark)", width: `${75 + (i % 3) * 10}%` }} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!authLoading && !user) return <LoginForm />;

  if (fetchError) {
    return (
      <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
        <Header />
        <div className="text-center py-20">
          <p className="font-serif text-lg mb-2" style={{ color: "var(--ink)" }}>Page not found</p>
          <p className="text-sm mb-4" style={{ color: "var(--ink-light)" }}>Check your connection and try again</p>
          <button
            onClick={() => {
              setFetchError(false); setLoading(true);
              getItem(id).then(setItem).catch(() => setFetchError(true)).finally(() => setLoading(false));
            }}
            className="px-4 py-2 text-sm font-semibold mr-3 transition-opacity hover:opacity-80"
            style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
          >
            Retry
          </button>
          <Link href="/" className="text-sm" style={{ color: "var(--gold)" }}>
            ← Table of Contents
          </Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
        <Header />
        <div className="text-center py-20">
          <p className="font-serif" style={{ color: "var(--ink-light)" }}>Entry not found</p>
          <Link href="/" className="text-sm mt-2 block" style={{ color: "var(--gold)" }}>
            ← Table of Contents
          </Link>
        </div>
      </div>
    );
  }

  async function handleCategoriesSave(cats: ActivityZoneId[]) {
    const currentItem = item;
    if (!currentItem) return;
    setSavingCategories(true);
    try {
      await updateItem(currentItem.id, { categories: cats }, { uid: user!.uid, email: user!.email ?? "" });
      setItem({ ...currentItem, categories: cats });
      setEditingCategories(false);
      toast.success("Chapters updated");
    } catch {
      toast.error("Failed to save chapters");
    } finally {
      setSavingCategories(false);
    }
  }

  async function handleTagsSave(tags: string[]) {
    const currentItem = item;
    if (!currentItem) return;
    setSavingTags(true);
    try {
      await updateItem(currentItem.id, { tags }, { uid: user!.uid, email: user!.email ?? "" });
      setItem({ ...currentItem, tags });
      setEditingTags(false);
      toast.success("Tags saved");
    } catch {
      toast.error("Failed to save tags");
    } finally {
      setSavingTags(false);
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/share/items/${id}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: item?.name ?? "An object story", url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
      setAudioPlaying(false);
    } else {
      audioRef.current.play().catch(() => setAudioPlaying(false));
      setAudioPlaying(true);
    }
  }

  async function handleDocTypeSave(newType: "story" | "lab") {
    if (!item) return;
    try {
      await updateItem(item.id, { documentationType: newType }, { uid: user!.uid, email: user!.email ?? "" });
      setItem({ ...item, documentationType: newType });
      toast.success(`Switched to ${newType === "lab" ? "Lab Notes" : "Story"} mode`);
    } catch {
      toast.error("Failed to update documentation mode");
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this entry? This cannot be undone.")) return;
    setDeleting(true);
    try {
      await deleteItem(id);
      toast.success("Entry deleted");
      router.push("/");
    } catch {
      toast.error("Failed to delete entry");
      setDeleting(false);
    }
  }

  const zones = item.categories
    .map((zid) => ACTIVITY_ZONES.find((z) => z.id === zid))
    .filter(Boolean);

  const formattedDate = item.addedAt
    ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(item.addedAt)
    : "";
  const formattedUpdatedDate = item.updatedAt
    ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric", timeZone: "UTC" }).format(item.updatedAt)
    : "";

  const hasOriginCoords = item.originPlace?.lat && item.originPlace?.lng;
  const osmUrl = hasOriginCoords
    ? `https://www.openstreetmap.org/?mlat=${item.originPlace.lat}&mlon=${item.originPlace.lng}#map=10/${item.originPlace.lat}/${item.originPlace.lng}`
    : null;

  // ── Edit mode ────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
        <Header />
        <main className="max-w-xl mx-auto px-6 py-8">
          <button
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1.5 text-sm mb-6 transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-light)" }}
          >
            <ArrowLeft className="w-4 h-4" /> Back to entry
          </button>
          <h2 className="font-serif text-xl font-bold mb-6" style={{ color: "var(--ink)" }}>
            Edit — {item.name}
          </h2>
          <EditItemForm
            item={item}
            userId={user?.uid ?? ""}
            userEmail={user?.email ?? ""}
            onSave={(updated) => { setItem(updated); setEditing(false); }}
            onCancel={() => setEditing(false)}
          />
        </main>
      </div>
    );
  }

  // ── Book page ────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      <Header />
      <main className="max-w-xl mx-auto px-6 py-8">

        {/* ── Back navigation ──────────────────────────────────── */}
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs tracking-wide uppercase mb-8 transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-light)" }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Table of Contents
        </Link>

        {/* ── Chapter rubric ───────────────────────────────────── */}
        {zones.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {zones.map((zone) => (
              <span
                key={zone!.id}
                className="text-xs tracking-wide"
                style={{ color: "var(--gold)" }}
              >
                {zone!.icon} {zone!.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Title ────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 mb-2">
          <div>
            <h1 className="font-serif text-3xl font-bold leading-tight" style={{ color: "var(--ink)" }}>
              {item.name}
            </h1>
            {item.description && (
              <p className="font-serif italic mt-2 text-base leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                {item.description}
              </p>
            )}
            {/* Doc type badge + switcher */}
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={() => handleDocTypeSave("story")}
                title="Switch to Story mode"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all rounded-full border ${
                  (item.documentationType ?? "story") === "story"
                    ? "border-amber-300 bg-amber-50 text-amber-700"
                    : "border-transparent text-stone-400 hover:border-stone-200 hover:text-stone-600"
                }`}
              >
                <BookOpen className="w-3 h-3" /> Story
              </button>
              <button
                onClick={() => handleDocTypeSave("lab")}
                title="Switch to Lab Notes mode"
                className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium transition-all rounded-full border ${
                  item.documentationType === "lab"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-transparent text-stone-400 hover:border-stone-200 hover:text-stone-600"
                }`}
              >
                <FlaskConical className="w-3 h-3" /> Lab Notes
              </button>
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-1 shrink-0">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-light)", background: "var(--parchment-dark)", border: "1px solid var(--border)" }}
            >
              <Share2 className="w-3 h-3" /> {copied ? "Copied!" : "Share"}
            </button>
            <button
              onClick={() => setEditing(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-light)", background: "var(--parchment-dark)", border: "1px solid var(--border)" }}
            >
              <Pencil className="w-3 h-3" /> Edit
            </button>
          </div>
        </div>

        {/* ── Rule ─────────────────────────────────────────────── */}
        <div className="h-px my-6" style={{ background: "var(--border)" }} />

        {/* ── Photo — full bleed hero ───────────────────────────── */}
        {item.photos.length > 0 && (
          <figure className="mb-10 -mx-6">
            <div className="relative" style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
              {/* Main photo */}
              <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
                <Image
                  src={item.photos[photoIndex]}
                  alt={item.name}
                  fill
                  className="object-cover"
                  priority
                />
                {/* Nav arrows */}
                {item.photos.length > 1 && (
                  <>
                    <button
                      onClick={() => setPhotoIndex((i) => (i - 1 + item.photos.length) % item.photos.length)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                      style={{ background: "rgba(44,36,22,0.55)", color: "#faf7f2" }}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setPhotoIndex((i) => (i + 1) % item.photos.length)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center"
                      style={{ background: "rgba(44,36,22,0.55)", color: "#faf7f2" }}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>
              {/* Thumbnail strip for multiple photos */}
              {item.photos.length > 1 && (
                <div className="flex gap-1.5 p-2" style={{ background: "var(--parchment-dark)" }}>
                  {item.photos.map((src, i) => (
                    <button
                      key={i}
                      onClick={() => setPhotoIndex(i)}
                      className="relative shrink-0 overflow-hidden transition-opacity"
                      style={{
                        width: 48, height: 36,
                        border: i === photoIndex ? "2px solid var(--gold)" : "1px solid var(--border)",
                        opacity: i === photoIndex ? 1 : 0.65,
                      }}
                    >
                      <Image src={src} alt="" fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <figcaption className="text-center text-xs italic mt-2 px-6" style={{ color: "var(--ink-light)" }}>
              {item.name}
            </figcaption>
          </figure>
        )}

        {/* ── Lab documentation ────────────────────────────────── */}
        {item.documentationType === "lab" && item.labData && (
          <section className="mb-8">
            <SectionRule label="Lab Documentation" />
            <div className="space-y-4">
              {/* Brand / Batch */}
              {(item.labData.brand || item.labData.batchLot) && (
                <div className="flex flex-wrap gap-4 text-sm font-serif" style={{ color: "var(--ink)" }}>
                  {item.labData.brand && (
                    <span><span style={{ color: "var(--ink-light)" }}>Brand </span>{item.labData.brand}</span>
                  )}
                  {item.labData.batchLot && (
                    <span><span style={{ color: "var(--ink-light)" }}>Batch </span>{item.labData.batchLot}</span>
                  )}
                  {item.labData.source && (
                    <span><span style={{ color: "var(--ink-light)" }}>Source </span>{item.labData.source}</span>
                  )}
                </div>
              )}

              {/* Results badge */}
              {item.labData.results?.success != null && (
                <div>
                  {item.labData.results.success
                    ? <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700">✓ Pass</span>
                    : <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">✗ Fail</span>
                  }
                  {item.labData.results.metric && (
                    <span className="text-xs ml-2" style={{ color: "var(--ink-light)" }}>{item.labData.results.metric}</span>
                  )}
                </div>
              )}

              {/* Observations */}
              {item.labData.observations && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gold)" }}>Observations</p>
                  <p className="font-serif text-base leading-7" style={{ color: "var(--ink)" }}>{item.labData.observations}</p>
                </div>
              )}

              {/* Specifications */}
              {Object.keys(item.labData.specifications).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--gold)" }}>Specifications</p>
                  <div className="space-y-1">
                    {Object.entries(item.labData.specifications).map(([k, v]) => (
                      <div key={k} className="flex gap-3 text-sm font-serif">
                        <span className="w-32 shrink-0" style={{ color: "var(--ink-light)" }}>{k}</span>
                        <span style={{ color: "var(--ink)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Test conditions */}
              {Object.keys(item.labData.testConditions).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--gold)" }}>Test Conditions</p>
                  <div className="space-y-1">
                    {Object.entries(item.labData.testConditions).map(([k, v]) => (
                      <div key={k} className="flex gap-3 text-sm font-serif">
                        <span className="w-32 shrink-0" style={{ color: "var(--ink-light)" }}>{k}</span>
                        <span style={{ color: "var(--ink)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Analysis */}
              {item.labData.analysis && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--gold)" }}>Analysis</p>
                  <p className="font-serif text-sm leading-7 italic" style={{ color: "var(--ink-mid)" }}>{item.labData.analysis}</p>
                </div>
              )}

              {/* Next steps */}
              {(item.labData.nextSteps ?? []).length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--gold)" }}>Next Steps</p>
                  <ol className="space-y-1">
                    {item.labData.nextSteps!.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm font-serif" style={{ color: "var(--ink)" }}>
                        <span style={{ color: "var(--gold)" }}>{i + 1}.</span> {s}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          </section>
        )}

        {/* ── Story ────────────────────────────────────────────── */}
        {item.story && (
          <section className="mb-8">
            <SectionRule label="Story" />
            <p
              className="font-serif text-base leading-8 drop-cap"
              style={{ color: "var(--ink)" }}
            >
              {item.story}
            </p>
            {/* Audio playback — hear the original voice recording */}
            {item.audioUrl && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  onClick={toggleAudio}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-opacity hover:opacity-75"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-mid)", background: "var(--parchment-light)" }}
                >
                  {audioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {audioPlaying ? "Pause" : "Listen to original recording"}
                </button>
                <audio
                  ref={audioRef}
                  src={item.audioUrl}
                  onEnded={() => setAudioPlaying(false)}
                  className="hidden"
                />
              </div>
            )}
          </section>
        )}

        {/* ── Provenance ───────────────────────────────────────── */}
        {item.provenance && (
          <section className="mb-8">
            <SectionRule label="Provenance" />
            <p className="font-serif text-base leading-8" style={{ color: "var(--ink)" }}>
              {item.provenance}
            </p>
          </section>
        )}

        {/* ── Annotations block ────────────────────────────────── */}
        <div
          className="my-8 p-5"
          style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}
        >
          <p
            className="text-[9px] tracking-[0.25em] uppercase mb-2 font-semibold"
            style={{ color: "var(--gold)" }}
          >
            Annotations
          </p>
          <div className="h-px mb-4" style={{ background: "var(--border)" }} />
          <div className="space-y-2 text-xs font-serif" style={{ color: "var(--ink-mid)" }}>
            {(item.addedByName || item.addedByEmail) && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Added by</span>
                <span>{item.addedByName || item.addedByEmail.split("@")[0]}</span>
              </div>
            )}
            {formattedDate && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>On</span>
                <span>{formattedDate}</span>
              </div>
            )}
            {item.microLocation && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Storage</span>
                <span className="flex items-center gap-1">
                  <Archive className="w-3 h-3 shrink-0" style={{ color: "var(--ink-light)" }} />
                  {item.microLocation}
                </span>
              </div>
            )}
            {item.macroLocation && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>City</span>
                <span>{item.macroLocation}</span>
              </div>
            )}
            {item.originPlace?.name && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Origin</span>
                <span className="flex items-center gap-1">
                  <Navigation className="w-3 h-3 shrink-0" style={{ color: "var(--gold)" }} />
                  {item.originPlace.name}
                  {osmUrl && (
                    <a href={osmUrl} target="_blank" rel="noopener noreferrer"
                      className="ml-1 underline" style={{ color: "var(--gold)" }}>
                      ↗
                    </a>
                  )}
                </span>
              </div>
            )}
            {item.condition && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Condition</span>
                <span>{item.condition}</span>
              </div>
            )}
            {item.passTo && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Pass to</span>
                <span className="flex items-center gap-1">
                  <Heart className="w-3 h-3 shrink-0 text-rose-400" />
                  {item.passTo}
                </span>
              </div>
            )}
            {item.isLoanable && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Lending</span>
                <span>⟲ Available to borrow</span>
              </div>
            )}
            {item.updatedByEmail && formattedUpdatedDate && (
              <div className="flex gap-3 pt-2" style={{ borderTop: "1px solid var(--border)" }}>
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Revised</span>
                <span>{item.updatedByEmail.split("@")[0]} · {formattedUpdatedDate}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Chapters (categories) ────────────────────────────── */}
        <section className="mb-4">
          <SectionRule label="Chapters" />
          {editingCategories ? (
            <div
              className="p-4"
              style={{ background: "var(--parchment-light)", border: "1px solid var(--border)" }}
            >
              <CategoryPicker selected={draftCategories} onChange={setDraftCategories} />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => handleCategoriesSave(draftCategories)}
                  disabled={savingCategories}
                  className="px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
                >
                  {savingCategories ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingCategories(false)}
                  disabled={savingCategories}
                  className="px-4 py-2 text-sm transition-opacity hover:opacity-70"
                  style={{ color: "var(--ink-mid)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {zones.map((zone) => (
                <span
                  key={zone!.id}
                  className="text-xs px-3 py-1"
                  style={{
                    color: "var(--ink-mid)",
                    background: "var(--parchment-dark)",
                    border: "1px solid var(--border)",
                  }}
                >
                  {zone!.icon} {zone!.label}
                </span>
              ))}
              <button
                onClick={() => { setDraftCategories([...item.categories]); setEditingCategories(true); }}
                className="flex items-center gap-1 text-xs px-2 py-1 transition-opacity hover:opacity-70"
                style={{ color: "var(--ink-light)", background: "var(--parchment-dark)", border: "1px solid var(--border)" }}
              >
                <Pencil className="w-2.5 h-2.5" /> Edit
              </button>
            </div>
          )}
        </section>

        {/* ── Tags ─────────────────────────────────────────────── */}
        <section className="mb-8">
          <SectionRule label="Tags" />
          {editingTags ? (
            <div
              className="p-4"
              style={{ background: "var(--parchment-light)", border: "1px solid var(--border)" }}
            >
              <TagInput tags={draftTags} onChange={setDraftTags} />
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => handleTagsSave(draftTags)}
                  disabled={savingTags}
                  className="px-4 py-2 text-sm font-semibold transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
                >
                  {savingTags ? "Saving…" : "Save"}
                </button>
                <button
                  onClick={() => setEditingTags(false)}
                  disabled={savingTags}
                  className="px-4 py-2 text-sm transition-opacity hover:opacity-70"
                  style={{ color: "var(--ink-mid)", border: "1px solid var(--border)" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2 items-center">
              {(item.tags ?? []).map((tag) => {
                const s = tagStyle(tag);
                return (
                  <Link
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="text-sm font-medium px-3 py-1.5 transition-opacity hover:opacity-80"
                    style={{ background: s.bg, color: s.color }}
                  >
                    #{tag}
                  </Link>
                );
              })}
              <button
                onClick={() => { setDraftTags([...(item.tags ?? [])]); setEditingTags(true); }}
                className="flex items-center gap-1 text-xs px-2.5 py-1.5 transition-opacity hover:opacity-70"
                style={{ color: "var(--ink-light)", background: "var(--parchment-dark)", border: "1px solid var(--border)" }}
              >
                <Pencil className="w-3 h-3" />
                {(item.tags ?? []).length === 0 ? "Add tags" : "Edit tags"}
              </button>
            </div>
          )}
        </section>

        {/* ── Original transcript ──────────────────────────────── */}
        {item.voiceTranscript && (
          <details className="mb-8">
            <summary
              className="text-xs cursor-pointer select-none uppercase tracking-wide transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-light)" }}
            >
              Voice transcript
            </summary>
            <blockquote
              className="mt-3 pl-4 font-serif italic text-sm leading-7"
              style={{ borderLeft: "2px solid var(--border)", color: "var(--ink-light)" }}
            >
              {item.voiceTranscript}
            </blockquote>
          </details>
        )}

        {/* ── Delete ───────────────────────────────────────────── */}
        <div className="pt-6" style={{ borderTop: "1px solid var(--border)" }}>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-2 text-xs transition-opacity hover:opacity-70 disabled:opacity-40"
            style={{ color: "var(--ink-light)" }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting…" : "Delete this entry"}
          </button>
        </div>
      </main>
    </div>
  );
}

// ── Decorative section rule ──────────────────────────────────────────
function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      <h2
        className="text-[9px] tracking-[0.3em] uppercase font-semibold shrink-0"
        style={{ color: "var(--gold)" }}
      >
        {label}
      </h2>
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
    </div>
  );
}

"use client";

// Public read-only view of a single item story — no login required.
//
// FIRESTORE RULE NEEDED (add to your Firestore rules):
//   match /inventory_items/{itemId} {
//     allow read: if true;   // or: if resource.data.inventoryId != null (public read)
//   }
// Without this rule, unauthenticated users will see the "Permission denied" fallback.

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getItem } from "@/lib/firestore";
import type { InventoryItem } from "@/lib/types";
import { ACTIVITY_ZONES } from "@/lib/types";
import { ChevronLeft, ChevronRight, Play, Pause, BookOpen } from "lucide-react";

export default function SharedItemPage() {
  const params = useParams();
  const id = params.id as string;
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!id) return;
    getItem(id)
      .then((data) => {
        if (!data) setError("This story could not be found.");
        else setItem(data);
      })
      .catch((err) => {
        console.error("[SharedItemPage] load error:", err);
        // Permission denied means the Firestore rule isn't set for public reads yet
        if (err?.code === "permission-denied") {
          setError("permission-denied");
        } else {
          setError("Unable to load this story. Please check your connection.");
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

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

  // ── Loading ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--parchment)" }}>
        <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  // ── Permission denied — Firestore rule not yet enabled ────────────
  if (error === "permission-denied") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--parchment)" }}>
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="font-serif text-xl font-bold mb-2" style={{ color: "var(--ink)" }}>
            Public sharing not yet enabled
          </h1>
          <p className="text-sm mb-6" style={{ color: "var(--ink-light)" }}>
            To view shared stories, the inventory owner needs to enable public access in their Firestore settings.
          </p>
          <Link href="/" className="text-sm underline" style={{ color: "var(--gold)" }}>
            Create your own InvenStories inventory →
          </Link>
        </div>
      </div>
    );
  }

  // ── Error / not found ─────────────────────────────────────────────
  if (error || !item) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ background: "var(--parchment)" }}>
        <div className="text-center">
          <p className="text-4xl mb-4">📖</p>
          <p className="font-serif text-lg mb-4" style={{ color: "var(--ink)" }}>
            {error ?? "Story not found"}
          </p>
          <Link href="/" className="text-sm underline" style={{ color: "var(--gold)" }}>
            Create your own InvenStories →
          </Link>
        </div>
      </div>
    );
  }

  const zones = item.categories
    .map((zid) => ACTIVITY_ZONES.find((z) => z.id === zid))
    .filter(Boolean);

  const formattedDate = item.addedAt
    ? new Intl.DateTimeFormat("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }).format(item.addedAt)
    : "";

  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      {/* ── Minimal shared header ─────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur-sm border-b"
        style={{ background: "var(--parchment-light)", borderColor: "var(--border)" }}
      >
        <div className="max-w-xl mx-auto px-4 h-12 flex items-center justify-between">
          <span className="font-serif font-bold text-sm" style={{ color: "var(--ink)" }}>
            InvenStories
          </span>
          <Link
            href="/"
            className="text-xs px-3 py-1.5 font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
          >
            Create your own →
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">

        {/* ── Chapter rubric ───────────────────────────────────── */}
        {zones.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {zones.map((zone) => (
              <span key={zone!.id} className="text-xs tracking-wide" style={{ color: "var(--gold)" }}>
                {zone!.icon} {zone!.label}
              </span>
            ))}
          </div>
        )}

        {/* ── Title ────────────────────────────────────────────── */}
        <h1 className="font-serif text-3xl font-bold leading-tight mb-2" style={{ color: "var(--ink)" }}>
          {item.name}
        </h1>
        {item.description && (
          <p className="font-serif italic text-base leading-relaxed mb-6" style={{ color: "var(--ink-mid)" }}>
            {item.description}
          </p>
        )}

        <div className="h-px mb-6" style={{ background: "var(--border)" }} />

        {/* ── Photo ────────────────────────────────────────────── */}
        {item.photos.length > 0 && (
          <figure className="mb-10 -mx-6">
            <div className="relative" style={{ border: "1px solid var(--border)", borderRadius: "8px", overflow: "hidden" }}>
              <div className="relative overflow-hidden" style={{ aspectRatio: "3/2" }}>
                <Image src={item.photos[photoIndex]} alt={item.name} fill className="object-cover" priority />
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
            </div>
          </figure>
        )}

        {/* ── Story ────────────────────────────────────────────── */}
        {item.story && (
          <section className="mb-8">
            <SectionRule label="Story" />
            <p className="font-serif text-base leading-8" style={{ color: "var(--ink)" }}>
              {item.story}
            </p>
            {item.audioUrl && (
              <div className="mt-4">
                <button
                  onClick={toggleAudio}
                  className="flex items-center gap-2 px-4 py-2 text-xs font-medium transition-opacity hover:opacity-75"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-mid)", background: "var(--parchment-light)" }}
                >
                  {audioPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  {audioPlaying ? "Pause" : "Listen to original recording"}
                </button>
                <audio ref={audioRef} src={item.audioUrl} onEnded={() => setAudioPlaying(false)} className="hidden" />
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
        <div className="my-8 p-5" style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}>
          <p className="text-[9px] tracking-[0.25em] uppercase mb-2 font-semibold" style={{ color: "var(--gold)" }}>
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
            {item.originPlace?.name && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Origin</span>
                <span className="flex items-center gap-1">
                  <span style={{ color: "var(--gold)" }}>📍</span>
                  {item.originPlace.name}
                </span>
              </div>
            )}
            {item.passTo && (
              <div className="flex gap-3">
                <span className="w-20 shrink-0" style={{ color: "var(--ink-light)" }}>Pass to</span>
                <span>❤ {item.passTo}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────── */}
        <div className="text-center py-8 border-t" style={{ borderColor: "var(--border)" }}>
          <BookOpen className="w-6 h-6 mx-auto mb-3" style={{ color: "var(--gold)" }} />
          <p className="font-serif text-sm mb-4" style={{ color: "var(--ink-light)" }}>
            Preserve the stories behind your own objects
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-opacity hover:opacity-80"
            style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
          >
            Start your InvenStories →
          </Link>
        </div>
      </main>
    </div>
  );
}

function SectionRule({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
      <h2 className="text-[9px] tracking-[0.3em] uppercase font-semibold shrink-0" style={{ color: "var(--gold)" }}>
        {label}
      </h2>
      <div className="h-px flex-1" style={{ background: "var(--border)" }} />
    </div>
  );
}

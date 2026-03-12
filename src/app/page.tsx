"use client";

import { useState } from "react";
import Image from "next/image";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { InventorySelector } from "@/components/inventory/InventorySelector";
import { Header } from "@/components/layout/Header";
import { ItemCard } from "@/components/inventory/ItemCard";
import { useInventory } from "@/hooks/useInventory";
import { ACTIVITY_ZONES, ActivityZoneId, InventoryItem } from "@/lib/types";
import Link from "next/link";
import { BookOpen, Plus, ArrowLeft } from "lucide-react";

const ROMAN = [
  "I","II","III","IV","V","VI","VII","VIII","IX","X",
  "XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX",
];

// ── Chapter preview card ───────────────────────────────────────────
function ChapterCard({
  zone, zoneIndex, chapterItems, onSelect,
}: {
  zone: typeof ACTIVITY_ZONES[number];
  zoneIndex: number;
  chapterItems: InventoryItem[];
  onSelect: () => void;
}) {
  const coverPhoto = chapterItems.find((i) => i.photos.length > 0)?.photos[0];
  return (
    <button
      onClick={onSelect}
      className="group w-full flex flex-col items-center py-6 px-4 gap-4 transition-opacity hover:opacity-85"
      style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}
    >
      {/* Handwritten chapter annotation */}
      <p
        className="text-base"
        style={{ fontFamily: "var(--font-caveat)", color: "var(--gold)", fontStyle: "italic", lineHeight: 1 }}
      >
        Chapter {ROMAN[zoneIndex]}
      </p>

      {/* Circular illustration frame */}
      <div
        className="relative shrink-0 overflow-hidden"
        style={{
          width: 88,
          height: 88,
          borderRadius: "50%",
          border: "2px solid var(--border)",
        }}
      >
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={zone.label}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: "var(--parchment-dark)" }}
          >
            {zone.icon}
          </div>
        )}
      </div>

      {/* Title */}
      <div className="text-center">
        <p className="font-serif font-semibold text-base leading-snug" style={{ color: "var(--ink)" }}>
          {zone.label}
        </p>
        <p className="text-xs mt-1 italic" style={{ color: "var(--ink-light)" }}>
          {chapterItems.length} {chapterItems.length === 1 ? "entry" : "entries"}
        </p>
      </div>
    </button>
  );
}

// ── Loading skeletons ──────────────────────────────────────────────
function ChapterSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="aspect-[4/3] animate-pulse" style={{ background: "var(--parchment-dark)", border: "1px solid var(--border)" }} />
      ))}
    </div>
  );
}

function ItemSkeletons() {
  return (
    <div className="grid grid-cols-2 gap-3 mt-2">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="animate-pulse" style={{ border: "1px solid var(--border)" }}>
          <div className="aspect-[4/3]" style={{ background: "var(--parchment-dark)" }} />
          <div className="p-3 space-y-2">
            <div className="h-3 rounded" style={{ background: "var(--parchment-dark)", width: "70%" }} />
            <div className="h-3 rounded" style={{ background: "var(--parchment-dark)", width: "50%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────
export default function HomePage() {
  const { user, loading: authLoading } = useAuthContext();
  const { currentInventory, loadingInventories } = useInventoryContext();
  const { items, loading: itemsLoading } = useInventory(currentInventory?.id ?? null);
  const [activeZone, setActiveZone] = useState<ActivityZoneId | "all">("all");

  if (!authLoading && !user) return <LoginForm />;
  if (!loadingInventories && !currentInventory) return <InventorySelector />;

  const isLoading = authLoading || itemsLoading;

  const populatedZones = ACTIVITY_ZONES
    .map((zone, zoneIndex) => ({ zone, zoneIndex }))
    .filter(({ zone }) => items.some((i) => i.categories.includes(zone.id)));

  const displayItems =
    activeZone === "all" ? items : items.filter((i) => i.categories.includes(activeZone));

  const chapters = populatedZones.map(({ zone, zoneIndex }) => ({
    zone,
    zoneIndex,
    chapterItems: items.filter((i) => i.categories.includes(zone.id)),
  }));

  const activeChapter = activeZone !== "all"
    ? populatedZones.find(({ zone }) => zone.id === activeZone)
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Title header ─────────────────────────────────────── */}
        <div className="text-center pt-4 pb-5">
          <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: "var(--ink-light)" }}>
            An inventory of objects &amp; their stories
          </p>
          <h1 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
            {currentInventory?.name ?? "Your Inventory"}
          </h1>
          <div className="flex items-center gap-3 justify-center mt-3">
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            <BookOpen className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <div className="h-px flex-1" style={{ background: "var(--border)" }} />
          </div>
        </div>

        {/* ── Ceremonial chapter opener ─────────────────────────── */}
        {activeZone !== "all" && activeChapter && (
          <div className="text-center mb-6">
            <button
              onClick={() => setActiveZone("all")}
              className="inline-flex items-center gap-1 text-xs uppercase tracking-wide mb-6 transition-opacity hover:opacity-70"
              style={{ color: "var(--ink-light)" }}
            >
              <ArrowLeft className="w-3.5 h-3.5" /> All Chapters
            </button>

            {/* Roman numeral */}
            <p
              className="text-5xl font-bold leading-none mb-1"
              style={{ fontFamily: "var(--font-caveat)", color: "var(--gold)", opacity: 0.35 }}
            >
              {ROMAN[activeChapter.zoneIndex]}
            </p>

            {/* Decorative rule */}
            <div className="flex items-center gap-3 my-3">
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
              <span className="text-xs" style={{ color: "var(--gold)" }}>✦</span>
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            </div>

            {/* Chapter title */}
            <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
              {activeChapter.zone.label}
            </h2>
            <p className="text-sm italic mt-1" style={{ color: "var(--ink-light)" }}>
              {displayItems.length} {displayItems.length === 1 ? "entry" : "entries"}
            </p>

            {/* Decorative rule */}
            <div className="flex items-center gap-3 mt-3 mb-1">
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
              <span className="text-xs" style={{ color: "var(--gold)" }}>✦</span>
              <div className="h-px flex-1" style={{ background: "var(--border)" }} />
            </div>
          </div>
        )}

        {/* ── Zone filter tabs (scrollable) ────────────────────── */}
        <div className="flex overflow-x-auto scrollbar-none border-b mb-1" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setActiveZone("all")}
            className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors tracking-wide uppercase"
            style={{
              borderColor: activeZone === "all" ? "var(--gold)" : "transparent",
              color: activeZone === "all" ? "var(--gold)" : "var(--ink-light)",
            }}
          >
            All Chapters
          </button>
          {populatedZones.map(({ zone }) => {
            const active = activeZone === zone.id;
            return (
              <button
                key={zone.id}
                onClick={() => setActiveZone(zone.id)}
                className="px-4 py-2.5 text-xs whitespace-nowrap shrink-0 border-b-2 transition-colors"
                style={{
                  borderColor: active ? "var(--gold)" : "transparent",
                  color: active ? "var(--gold)" : "var(--ink-light)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {zone.icon} {zone.label}
              </button>
            );
          })}
        </div>

        {/* ── Stats + Add ───────────────────────────────────────── */}
        <div className="flex items-center justify-between py-3 text-xs" style={{ color: "var(--ink-light)" }}>
          {activeZone === "all" && (
            <span>{isLoading ? "Loading…" : `${chapters.length} chapters · ${items.length} entries`}</span>
          )}
          {activeZone !== "all" && <span />}
          <Link
            href="/add"
            className="flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-75"
            style={{ color: "var(--gold)" }}
          >
            <Plus className="w-3.5 h-3.5" /> Add entry
          </Link>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        {isLoading ? (
          activeZone === "all" ? <ChapterSkeletons /> : <ItemSkeletons />

        ) : displayItems.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📖</p>
            <h3 className="font-serif font-semibold text-lg" style={{ color: "var(--ink)" }}>
              {activeZone === "all" ? "This book has no entries yet" : "No entries in this chapter"}
            </h3>
            <p className="text-sm mt-1 mb-6" style={{ color: "var(--ink-light)" }}>
              Pick up an object and capture its story
            </p>
            <Link
              href="/add"
              className="inline-flex items-center gap-2 px-6 py-3 font-semibold text-sm transition-opacity hover:opacity-80"
              style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
            >
              <Plus className="w-4 h-4" /> Add your first entry
            </Link>
          </div>

        ) : activeZone === "all" ? (
          /* ── Visual chapter grid ── */
          <div className="grid grid-cols-2 gap-3">
            {chapters.map(({ zone, zoneIndex, chapterItems }) => (
              <ChapterCard
                key={zone.id}
                zone={zone}
                zoneIndex={zoneIndex}
                chapterItems={chapterItems}
                onSelect={() => setActiveZone(zone.id)}
              />
            ))}
          </div>

        ) : (
          /* ── Photo card grid for single chapter ── */
          <div className="grid grid-cols-2 gap-3">
            {displayItems.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

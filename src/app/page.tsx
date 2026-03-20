"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { InventorySelector } from "@/components/inventory/InventorySelector";
import { Header } from "@/components/layout/Header";
import { ItemCard } from "@/components/inventory/ItemCard";
import { useInventory } from "@/hooks/useInventory";
import { useOnboarding } from "@/hooks/useOnboarding";
import { WelcomeModal } from "@/components/onboarding/WelcomeModal";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import { InventoryItem } from "@/lib/types";
import { updateInventorySettings } from "@/lib/inventories";
import {
  deriveChapters,
  getRelatedLocations,
  getChapterIcon,
  DerivedChapter,
} from "@/lib/chapters";
import type { CustomChapter } from "@/lib/types";
import { BookOpen, Plus, ArrowLeft, MapPin, X, Pencil } from "lucide-react";
import { v4 as uuidv4 } from "uuid";

const ROMAN = [
  "I","II","III","IV","V","VI","VII","VIII","IX","X",
  "XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX",
];

// ── Chapter preview card (location-based) ──────────────────────────────────
function ChapterCard({
  chapter, onSelect,
}: {
  chapter: DerivedChapter;
  onSelect: () => void;
}) {
  const coverPhoto = chapter.items.find((i) => i.photos.length > 0)?.photos[0];
  return (
    <button
      onClick={onSelect}
      className="group w-full flex flex-col items-center py-6 px-4 gap-4 transition-opacity hover:opacity-85"
      style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}
    >
      <p
        className="text-base"
        style={{ fontFamily: "var(--font-caveat)", color: "var(--gold)", fontStyle: "italic", lineHeight: 1 }}
      >
        Chapter {ROMAN[chapter.chapterNumber - 1] ?? chapter.chapterNumber}
      </p>

      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: 88, height: 88, borderRadius: "50%", border: "2px solid var(--border)" }}
      >
        {coverPhoto ? (
          <Image
            src={coverPhoto}
            alt={chapter.name}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: "var(--parchment-dark)" }}
          >
            {chapter.icon}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-serif font-semibold text-base leading-snug" style={{ color: "var(--ink)" }}>
          {chapter.name}
        </p>
        <p className="text-xs mt-1 italic" style={{ color: "var(--ink-light)" }}>
          {chapter.items.length} {chapter.items.length === 1 ? "entry" : "entries"}
        </p>
      </div>
    </button>
  );
}

// ── Custom chapter card ─────────────────────────────────────────────────────
function CustomChapterCard({
  chapter, items, onSelect,
}: {
  chapter: CustomChapter;
  items: InventoryItem[];
  onSelect: () => void;
}) {
  const coverPhoto = items.find((i) => i.photos.length > 0)?.photos[0];
  const icon = chapter.icon ?? getChapterIcon(chapter.name);
  return (
    <button
      onClick={onSelect}
      className="group w-full flex flex-col items-center py-6 px-4 gap-4 transition-opacity hover:opacity-85 relative"
      style={{ border: "1px dashed var(--border)", background: "var(--parchment-light)" }}
    >
      {/* Custom badge */}
      <span
        className="absolute top-2 right-2 text-[9px] uppercase tracking-wide px-1.5 py-0.5 font-semibold"
        style={{ background: "var(--parchment-dark)", color: "var(--gold)", border: "1px solid var(--border)" }}
      >
        Custom
      </span>

      <div
        className="relative shrink-0 overflow-hidden"
        style={{ width: 88, height: 88, borderRadius: "50%", border: "2px solid var(--border)" }}
      >
        {coverPhoto ? (
          <Image src={coverPhoto} alt={chapter.name} fill className="object-cover" />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center text-3xl"
            style={{ background: "var(--parchment-dark)" }}
          >
            {icon}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="font-serif font-semibold text-base leading-snug" style={{ color: "var(--ink)" }}>
          {chapter.name}
        </p>
        <p className="text-xs mt-1 italic" style={{ color: "var(--ink-light)" }}>
          {items.length} {items.length === 1 ? "entry" : "entries"}
        </p>
      </div>
    </button>
  );
}

// ── Loading skeletons ───────────────────────────────────────────────────────
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

// ── Create custom chapter modal ─────────────────────────────────────────────
function CreateChapterModal({
  allTags,
  onSave,
  onClose,
}: {
  allTags: string[];
  onSave: (chapter: CustomChapter) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { toast.error("Please enter a chapter name"); return; }
    if (selectedTags.length === 0) { toast.error("Select at least one tag to auto-populate this chapter"); return; }
    onSave({
      id: uuidv4(),
      name: trimmed,
      icon: getChapterIcon(trimmed),
      filterTags: selectedTags,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div
        className="w-full max-w-sm p-6 space-y-4"
        style={{ background: "var(--parchment-light)", border: "1px solid var(--border)" }}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-serif font-bold text-base" style={{ color: "var(--ink)" }}>
            Create Custom Chapter
          </h3>
          <button onClick={onClose} style={{ color: "var(--ink-light)" }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--ink-light)" }}>Chapter name</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Library, Vintage Fabrics, For Maya…"
            className="w-full text-sm px-3 py-2 focus:outline-none focus:ring-2"
            style={{
              background: "var(--parchment)", border: "1px solid var(--border)",
              color: "var(--ink)",
            }}
          />
        </div>

        <div>
          <p className="text-xs font-medium mb-1" style={{ color: "var(--ink-light)" }}>
            Auto-populate from tags <span className="font-normal italic">(items with these tags will appear in this chapter)</span>
          </p>
          {allTags.length === 0 ? (
            <p className="text-xs italic" style={{ color: "var(--ink-light)" }}>No tags in your inventory yet</p>
          ) : (
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className="text-xs px-2.5 py-1 transition-colors"
                  style={{
                    background: selectedTags.includes(tag) ? "var(--gold)" : "var(--parchment-dark)",
                    color: selectedTags.includes(tag) ? "var(--parchment-light)" : "var(--ink-mid)",
                    border: "1px solid var(--border)",
                  }}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button
            onClick={handleSave}
            className="flex-1 py-2.5 text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ background: "var(--gold)", color: "var(--parchment-light)" }}
          >
            Create chapter
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-mid)", border: "1px solid var(--border)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function HomePage() {
  const { user, loading: authLoading } = useAuthContext();
  const { showWelcome, runTour, dismissWelcome, startTour, finishTour, resetOnboarding } = useOnboarding(user?.uid ?? null);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__resetOnboarding = resetOnboarding;
  }, [resetOnboarding]);

  const { currentInventory, loadingInventories } = useInventoryContext();
  const { items, loading: itemsLoading } = useInventory(currentInventory?.id ?? null);
  const [activeChapter, setActiveChapter] = useState<string | "all">("all");
  const [showCreateChapter, setShowCreateChapter] = useState(false);
  const [savingChapter, setSavingChapter] = useState(false);

  // ── Hooks must all come before any early returns ──────────────────────────
  const handleSaveCustomChapter = useCallback(async (chapter: CustomChapter) => {
    if (!currentInventory) return;
    setSavingChapter(true);
    try {
      const existing = currentInventory.settings?.customChapters ?? [];
      await updateInventorySettings(currentInventory.id, {
        ...currentInventory.settings,
        customChapters: [...existing, chapter],
      });
      setShowCreateChapter(false);
      toast.success(`"${chapter.name}" chapter created`);
    } catch {
      toast.error("Failed to create chapter");
    } finally {
      setSavingChapter(false);
    }
  }, [currentInventory]);

  const handleDeleteCustomChapter = useCallback(async (chapterId: string) => {
    if (!currentInventory) return;
    const existing = currentInventory.settings?.customChapters ?? [];
    await updateInventorySettings(currentInventory.id, {
      ...currentInventory.settings,
      customChapters: existing.filter((c) => c.id !== chapterId),
    });
    if (activeChapter === chapterId) setActiveChapter("all");
    toast.success("Chapter removed");
  }, [currentInventory, activeChapter]);

  if (!authLoading && !user) return <LoginForm />;
  if (!authLoading && !loadingInventories && !currentInventory) return <InventorySelector />;

  const isLoading = authLoading || itemsLoading;

  // ── Derive location-based chapters ────────────────────────────────────────
  const derivedChapters = deriveChapters(items);

  // ── Custom chapters from inventory settings ───────────────────────────────
  const customChapterDefs = currentInventory?.settings?.customChapters ?? [];
  const customChapterViews = customChapterDefs.map((def) => {
    const matchingItems = items.filter(
      (i) =>
        (def.filterTags ?? []).some((t) => (i.tags ?? []).includes(t)) ||
        (def.filterCategories ?? []).some((c) => i.categories.includes(c)) ||
        (def.filterPassTo ? i.passTo.toLowerCase().includes(def.filterPassTo.toLowerCase()) : false)
    );
    return { def, items: matchingItems };
  });

  // ── Active chapter logic ──────────────────────────────────────────────────
  const activeLocationChapter = activeChapter !== "all"
    ? derivedChapters.find((ch) => ch.name === activeChapter)
    : null;
  const activeCustomChapter = activeChapter !== "all" && !activeLocationChapter
    ? customChapterViews.find((cv) => cv.def.id === activeChapter)
    : null;

  const displayItems =
    activeChapter === "all"
      ? items
      : activeLocationChapter
      ? activeLocationChapter.items
      : activeCustomChapter
      ? activeCustomChapter.items
      : [];

  // ── Related locations (for chapter detail view) ───────────────────────────
  const relatedLocations =
    activeLocationChapter
      ? getRelatedLocations(activeLocationChapter.name, derivedChapters)
      : [];

  // ── All unique tags (for custom chapter creation) ─────────────────────────
  const allTags = [...new Set(items.flatMap((i) => i.tags ?? []))].sort();

  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      {showWelcome && <WelcomeModal onTakeTour={startTour} onSkip={dismissWelcome} />}
      <OnboardingTour run={runTour} onFinish={finishTour} />
      {showCreateChapter && (
        <CreateChapterModal
          allTags={allTags}
          onSave={handleSaveCustomChapter}
          onClose={() => setShowCreateChapter(false)}
        />
      )}

      <Header />
      <main className="max-w-2xl mx-auto px-4 py-6">

        {/* ── Title header ──────────────────────────────────────── */}
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

        {/* ── Chapter opener (when a chapter is active) ──────────── */}
        {activeChapter !== "all" && (activeLocationChapter || activeCustomChapter) && (() => {
          const chName = activeLocationChapter?.name ?? activeCustomChapter?.def.name ?? "";
          const chIcon = activeLocationChapter?.icon ?? getChapterIcon(activeCustomChapter?.def.name ?? "");
          const chNum = activeLocationChapter?.chapterNumber;
          const isCustom = !!activeCustomChapter;
          return (
            <div className="text-center mb-6">
              <button
                onClick={() => setActiveChapter("all")}
                className="inline-flex items-center gap-1 text-xs uppercase tracking-wide mb-6 transition-opacity hover:opacity-70"
                style={{ color: "var(--ink-light)" }}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> All Chapters
              </button>

              {chNum && (
                <p
                  className="text-5xl font-bold leading-none mb-1"
                  style={{ fontFamily: "var(--font-caveat)", color: "var(--gold)", opacity: 0.35 }}
                >
                  {ROMAN[chNum - 1] ?? chNum}
                </p>
              )}

              <div className="flex items-center gap-3 my-3">
                <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--gold)" }}>✦</span>
                <div className="h-px flex-1" style={{ background: "var(--border)" }} />
              </div>

              <div className="flex items-center justify-center gap-2">
                <h2 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
                  {chIcon} {chName}
                </h2>
                {isCustom && (
                  <span className="text-[9px] uppercase tracking-wide px-1.5 py-0.5 font-semibold"
                    style={{ background: "var(--parchment-dark)", color: "var(--gold)", border: "1px solid var(--border)" }}>
                    Custom
                  </span>
                )}
              </div>
              <p className="text-sm italic mt-1" style={{ color: "var(--ink-light)" }}>
                {displayItems.length} {displayItems.length === 1 ? "entry" : "entries"}
                {isCustom && activeCustomChapter && (
                  <span className="ml-2">
                    · <button
                        onClick={() => handleDeleteCustomChapter(activeCustomChapter.def.id)}
                        className="underline transition-opacity hover:opacity-70"
                        style={{ color: "var(--ink-light)" }}
                      >remove chapter</button>
                  </span>
                )}
              </p>

              <div className="flex items-center gap-3 mt-3 mb-1">
                <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                <span className="text-xs" style={{ color: "var(--gold)" }}>✦</span>
                <div className="h-px flex-1" style={{ background: "var(--border)" }} />
              </div>
            </div>
          );
        })()}

        {/* ── Chapter tabs ──────────────────────────────────────── */}
        <div className="flex overflow-x-auto scrollbar-none border-b mb-1" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setActiveChapter("all")}
            className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0 border-b-2 transition-colors tracking-wide uppercase"
            style={{
              borderColor: activeChapter === "all" ? "var(--gold)" : "transparent",
              color: activeChapter === "all" ? "var(--gold)" : "var(--ink-light)",
            }}
          >
            All Chapters
          </button>
          {derivedChapters.map((ch) => {
            const active = activeChapter === ch.name;
            return (
              <button
                key={ch.name}
                onClick={() => setActiveChapter(ch.name)}
                className="px-4 py-2.5 text-xs whitespace-nowrap shrink-0 border-b-2 transition-colors"
                style={{
                  borderColor: active ? "var(--gold)" : "transparent",
                  color: active ? "var(--gold)" : "var(--ink-light)",
                  fontWeight: active ? 600 : 400,
                }}
              >
                {ch.icon} {ch.name}
              </button>
            );
          })}
          {customChapterViews.map(({ def, items: citems }) => {
            const active = activeChapter === def.id;
            return (
              <button
                key={def.id}
                onClick={() => setActiveChapter(def.id)}
                className="px-4 py-2.5 text-xs whitespace-nowrap shrink-0 border-b-2 transition-colors"
                style={{
                  borderColor: active ? "var(--gold)" : "transparent",
                  color: active ? "var(--gold)" : "var(--ink-light)",
                  fontWeight: active ? 600 : 400,
                  fontStyle: "italic",
                }}
              >
                {def.icon ?? getChapterIcon(def.name)} {def.name}
                <span className="ml-1 text-[9px]" style={{ color: "var(--gold)", opacity: 0.7 }}>({citems.length})</span>
              </button>
            );
          })}
        </div>

        {/* ── Stats + Add + Create chapter ──────────────────────── */}
        <div className="flex items-center justify-between py-3 text-xs" style={{ color: "var(--ink-light)" }}>
          {activeChapter === "all" ? (
            <span>{isLoading ? "Loading…" : `${derivedChapters.length} chapters · ${items.length} entries`}</span>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-3">
            {activeChapter === "all" && (
              <button
                onClick={() => setShowCreateChapter(true)}
                className="flex items-center gap-1 transition-opacity hover:opacity-75"
                style={{ color: "var(--ink-mid)" }}
                disabled={savingChapter}
              >
                <Pencil className="w-3 h-3" /> Custom chapter
              </button>
            )}
            <Link
              href="/add"
              className="flex items-center gap-1.5 font-semibold transition-opacity hover:opacity-75"
              style={{ color: "var(--gold)" }}
            >
              <Plus className="w-3.5 h-3.5" /> Add entry
            </Link>
          </div>
        </div>

        {/* ── Content ───────────────────────────────────────────── */}
        {isLoading ? (
          activeChapter === "all" ? <ChapterSkeletons /> : <ItemSkeletons />

        ) : displayItems.length === 0 && activeChapter === "all" ? (
          <div className="text-center py-20">
            <p className="text-5xl mb-4">📖</p>
            <h3 className="font-serif font-semibold text-lg" style={{ color: "var(--ink)" }}>
              This book has no entries yet
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

        ) : displayItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-3xl mb-3">📭</p>
            <p className="font-serif font-semibold" style={{ color: "var(--ink)" }}>No entries in this chapter</p>
            <button
              onClick={() => setActiveChapter("all")}
              className="text-sm mt-2 underline"
              style={{ color: "var(--ink-light)" }}
            >
              Back to all chapters
            </button>
          </div>

        ) : activeChapter === "all" ? (
          /* ── Chapter grid (all chapters view) ── */
          <div className="space-y-6">
            {/* Location chapters */}
            <div className="grid grid-cols-2 gap-3" data-tour="chapter-grid">
              {derivedChapters.map((ch) => (
                <ChapterCard
                  key={ch.name}
                  chapter={ch}
                  onSelect={() => setActiveChapter(ch.name)}
                />
              ))}
              {customChapterViews.map(({ def, items: citems }) => (
                <CustomChapterCard
                  key={def.id}
                  chapter={def}
                  items={citems}
                  onSelect={() => setActiveChapter(def.id)}
                />
              ))}
            </div>
          </div>

        ) : (
          /* ── Item grid for single chapter ── */
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {displayItems.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>

            {/* ── Related items in other locations ── */}
            {relatedLocations.length > 0 && (
              <div
                className="mt-2 p-4"
                style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                  <p
                    className="text-[9px] tracking-[0.3em] uppercase font-semibold shrink-0"
                    style={{ color: "var(--gold)" }}
                  >
                    Related items in other locations
                  </p>
                  <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                </div>

                <div className="space-y-2">
                  {relatedLocations.map((rel) => (
                    <button
                      key={rel.chapterName}
                      onClick={() => setActiveChapter(rel.chapterName)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 transition-colors group"
                      style={{ border: "1px solid var(--border)", background: "var(--parchment)" }}
                    >
                      <span className="text-xl shrink-0">{rel.icon}</span>
                      <div className="flex-1 text-left min-w-0">
                        <span className="font-serif font-medium text-sm" style={{ color: "var(--ink)" }}>
                          {rel.count} {rel.count === 1 ? "item" : "items"} in {rel.chapterName}
                        </span>
                        {rel.sharedTheme && (
                          <span className="text-xs ml-1 italic" style={{ color: "var(--ink-light)" }}>
                            — {rel.sharedTheme}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs shrink-0 transition-opacity group-hover:opacity-100 opacity-60"
                        style={{ color: "var(--gold)" }}
                      >
                        View →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

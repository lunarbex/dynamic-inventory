"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { createInventory } from "@/lib/inventories";
import { PENDING_INVITE_KEY } from "@/app/invite/[code]/page";
import { BookOpen, Plus, Loader2, Users, ArrowLeft, Check } from "lucide-react";
import toast from "react-hot-toast";
import type { InventoryMode } from "@/lib/types";

// ── Mode definitions ───────────────────────────────────────────────────────

const MODES: {
  id: InventoryMode;
  icon: string;
  label: string;
  tagline: string;
  description: string;
  agents: string[];
  bestFor: string;
  accent: string;
  bg: string;
  border: string;
}[] = [
  {
    id: "family",
    icon: "📖",
    label: "Family & Memory",
    tagline: "Preserve stories and meaning",
    description: "Voice-first workflow, warm storytelling, emotional connection to objects.",
    agents: ["Story Listener", "Transition Doula", "Memory Keeper", "Relationship Mapper"],
    bestFor: "Heirlooms, family archives, estate planning",
    accent: "#8b6914",
    bg: "#fdfaf4",
    border: "#e8d5a3",
  },
  {
    id: "professional",
    icon: "🔬",
    label: "Professional & Materials",
    tagline: "Track materials, tests, and iterations",
    description: "Structured extraction, technical specs, comparative analysis.",
    agents: ["Lab Assistant", "Pattern Recognition", "Cartographer"],
    bestFor: "Artists, makers, product testers, researchers",
    accent: "#2d5f8a",
    bg: "#f0f6fc",
    border: "#b3d0e8",
  },
  {
    id: "mixed",
    icon: "🎯",
    label: "Mixed — All Features",
    tagline: "Full flexibility",
    description: "Every agent, every view, every workflow. You choose what to use.",
    agents: ["All agents available"],
    bestFor: "Power users with diverse needs",
    accent: "#4a4a4a",
    bg: "#f8f8f7",
    border: "#d4d4d0",
  },
];

// ── Mode selection step ────────────────────────────────────────────────────

function ModeStep({
  selected,
  onSelect,
  onContinue,
  onBack,
}: {
  selected: InventoryMode;
  onSelect: (m: InventoryMode) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <button
          onClick={onBack}
          className="p-1 rounded-lg transition-colors hover:bg-stone-100 text-stone-400 hover:text-stone-600"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-stone-700">What kind of inventory is this?</p>
          <p className="text-xs text-stone-400">You can change this later in settings</p>
        </div>
      </div>

      <div className="space-y-2">
        {MODES.map((mode) => {
          const isSelected = selected === mode.id;
          return (
            <button
              key={mode.id}
              onClick={() => onSelect(mode.id)}
              className="w-full text-left p-4 rounded-2xl border-2 transition-all"
              style={{
                background: isSelected ? mode.bg : "white",
                borderColor: isSelected ? mode.border : "#e7e5e4",
                boxShadow: isSelected ? `0 0 0 1px ${mode.border}` : "none",
              }}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl leading-none mt-0.5 shrink-0">{mode.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-stone-800 text-sm">{mode.label}</span>
                    {isSelected && (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: mode.accent }}
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: mode.accent }}>{mode.tagline}</p>
                  <p className="text-xs text-stone-500 mt-1 leading-relaxed">{mode.description}</p>
                  <p className="text-xs text-stone-400 mt-1.5">
                    <span className="font-medium text-stone-500">Best for: </span>
                    {mode.bestFor}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        onClick={onContinue}
        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        Continue →
      </button>
    </div>
  );
}

// ── Name step ──────────────────────────────────────────────────────────────

function NameStep({
  mode,
  onBack,
  onSubmit,
  saving,
}: {
  mode: InventoryMode;
  onBack: () => void;
  onSubmit: (name: string) => Promise<void>;
  saving: boolean;
}) {
  const [name, setName] = useState("");
  const modeInfo = MODES.find((m) => m.id === mode)!;

  const placeholders: Record<InventoryMode, string> = {
    family: '"Mom\'s Estate," "Family Heirlooms"',
    professional: '"Studio Materials," "Product Testing"',
    mixed: '"Our Home," "Personal Archive"',
  };

  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(name); }}
      className="space-y-3"
    >
      <div className="flex items-center gap-2 mb-1">
        <button
          type="button"
          onClick={onBack}
          className="p-1 rounded-lg transition-colors hover:bg-stone-100 text-stone-400 hover:text-stone-600"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-stone-700">Name your inventory</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span className="text-xs">{modeInfo.icon}</span>
            <span className="text-xs" style={{ color: modeInfo.accent }}>{modeInfo.label}</span>
          </div>
        </div>
      </div>

      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={`e.g. ${placeholders[mode]}`}
        className="w-full text-sm bg-stone-50 border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-amber-400 placeholder-stone-300"
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !name.trim()}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:bg-stone-200 disabled:text-stone-400 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create"}
        </button>
        <button
          type="button"
          onClick={onBack}
          disabled={saving}
          className="px-4 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-600 text-sm font-medium rounded-xl transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Mode badge (used in inventory list) ───────────────────────────────────

function ModeBadge({ mode }: { mode: InventoryMode }) {
  const info = MODES.find((m) => m.id === mode)!;
  return (
    <span
      className="text-[9px] font-semibold px-1.5 py-0.5 rounded-md"
      style={{ background: info.bg, color: info.accent, border: `1px solid ${info.border}` }}
    >
      {info.icon} {info.label}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

type CreatingStep = "mode" | "name";

export function InventorySelector() {
  const { user } = useAuthContext();
  const { inventories, loadingInventories, selectInventory } = useInventoryContext();
  const [creatingStep, setCreatingStep] = useState<CreatingStep | null>(null);
  const [selectedMode, setSelectedMode] = useState<InventoryMode>("mixed");
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const pendingCode = sessionStorage.getItem(PENDING_INVITE_KEY);
    if (pendingCode) {
      router.replace(`/invite/${pendingCode}`);
    }
  }, [router]);

  async function handleCreate(name: string) {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      const book = await createInventory(name.trim(), user.uid, user.email ?? "", selectedMode);
      toast.success(`"${book.name}" created`);
      selectInventory(book.id);
    } catch {
      toast.error("Failed to create inventory");
    } finally {
      setSaving(false);
    }
  }

  if (loadingInventories) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        {/* Branding — hide when in creation steps */}
        {!creatingStep && (
          <div className="text-center mb-8">
            <BookOpen className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-stone-900">InvenStories</h1>
            <p className="text-stone-500 text-sm mt-1">
              {inventories.length === 0
                ? "Create your first inventory to get started"
                : "Choose an inventory to open"}
            </p>
          </div>
        )}

        {/* Existing inventories */}
        {!creatingStep && inventories.length > 0 && (
          <div className="space-y-2 mb-6">
            {inventories.map((inv) => {
              const memberCount = Object.keys(inv.members).length;
              return (
                <button
                  key={inv.id}
                  onClick={() => selectInventory(inv.id)}
                  className="w-full flex items-center gap-3 p-4 bg-white border border-stone-200 hover:border-amber-400 hover:bg-amber-50 rounded-2xl transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-xl">{MODES.find((m) => m.id === inv.mode)?.icon ?? "📦"}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-stone-800 truncate">{inv.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-stone-400 flex items-center gap-1">
                        <Users className="w-3 h-3" />
                        {memberCount} {memberCount === 1 ? "member" : "members"}
                      </p>
                      <ModeBadge mode={inv.mode} />
                    </div>
                  </div>
                  <span className="text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity text-sm font-medium shrink-0">
                    Open →
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Creation flow */}
        {creatingStep === "mode" && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <ModeStep
              selected={selectedMode}
              onSelect={setSelectedMode}
              onContinue={() => setCreatingStep("name")}
              onBack={() => setCreatingStep(null)}
            />
          </div>
        )}

        {creatingStep === "name" && (
          <div className="bg-white border border-stone-200 rounded-2xl p-4">
            <NameStep
              mode={selectedMode}
              onBack={() => setCreatingStep("mode")}
              onSubmit={handleCreate}
              saving={saving}
            />
          </div>
        )}

        {/* New inventory button */}
        {!creatingStep && (
          <button
            onClick={() => { setSelectedMode("mixed"); setCreatingStep("mode"); }}
            className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 text-stone-500 hover:text-amber-600 rounded-2xl transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New inventory
          </button>
        )}
      </div>
    </div>
  );
}

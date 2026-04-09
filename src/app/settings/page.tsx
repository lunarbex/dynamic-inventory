"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import { useInventoryContext } from "@/context/InventoryContext";
import { LoginForm } from "@/components/auth/LoginForm";
import { Header } from "@/components/layout/Header";
import { useInventory } from "@/hooks/useInventory";
import { useOnboarding } from "@/hooks/useOnboarding";
import { OnboardingTour } from "@/components/onboarding/OnboardingTour";
import {
  getAgentPreferences, saveAgentPreferences,
  getPatternInsights, savePatternInsights, dismissPatternInsight,
  getCartographerInsights, saveCartographerInsights, dismissCartographerInsight,
  getTransitionDoulaData, saveTransitionGuidance, addDecideLaterItem, removeDecideLaterItem,
  getLabAssistantResult, saveLabAssistantResult, dismissLabNote,
} from "@/lib/firestore";
import type { AgentId, UserAgentPreferences, PatternInsight, PatternRecognitionResult, CartographicInsight, CartographicResult, TransitionInsight, TransitionDoulaData, LabNote, LabAssistantResult, InventoryMode } from "@/lib/types";
import { PatternInsightsPanel } from "@/components/agents/PatternInsightsPanel";
import { CartographerInsightsPanel } from "@/components/agents/CartographerInsightsPanel";
import { TransitionDoulaPanel } from "@/components/agents/TransitionDoulaPanel";
import { LabAssistantPanel } from "@/components/agents/LabAssistantPanel";
import { ChevronDown, ChevronUp, Sparkles, Feather, Compass, Globe, LampDesk, GitBranch, Bookmark, Sprout, FlaskConical, BookOpen, TestTube } from "lucide-react";
import { updateInventoryMode } from "@/lib/inventories";
import toast from "react-hot-toast";

// ── Agent definitions ──────────────────────────────────────────────────
interface AgentSetting {
  key: string;
  label: string;
  type: "select";
  options: string[];
  default: string;
}

interface AgentDef {
  id: AgentId;
  name: string;
  archetype: string;
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { className?: string }>;
  palette: { bg: string; iconBg: string; iconColor: string; accent: string };
  descriptor: string;
  description: string;
  principles: string[];
  whenHelpful: string;
  whenToDisable: string;
  status: "active" | "available" | "coming_soon";
  defaultEnabled: boolean;
  alwaysOn?: boolean;
  settings: AgentSetting[];
  // Mode relevance: which modes show this agent by default
  primaryModes: InventoryMode[];
}

// ── Mode metadata ──────────────────────────────────────────────────────────

const MODE_META: Record<InventoryMode, {
  icon: string;
  label: string;
  tagline: string;
  accent: string;
  accentLight: string;
}> = {
  family: {
    icon: "📖",
    label: "Family & Memory",
    tagline: "Story-focused agents, voice-first workflow",
    accent: "#8b6914",
    accentLight: "#f0e8d0",
  },
  professional: {
    icon: "🔬",
    label: "Professional & Materials",
    tagline: "Technical agents, structured extraction",
    accent: "#2d5f8a",
    accentLight: "#dde6f0",
  },
  mixed: {
    icon: "🎯",
    label: "Mixed — All Features",
    tagline: "All agents available, full flexibility",
    accent: "#4a4a4a",
    accentLight: "#e8e8e6",
  },
};

const AGENTS: AgentDef[] = [
  {
    id: "story_listener",
    name: "Story Listener",
    archetype: "The Scribe",
    Icon: Feather,
    palette: { bg: "#faf6ef", iconBg: "#f0e8d0", iconColor: "#8b6914", accent: "#8b6914" },
    descriptor: "Listens to your stories and preserves them faithfully",
    description: "Transcribes your voice recordings and extracts structured data — names, places, dates, relationships — while keeping the warmth and specificity of how you actually speak.",
    principles: [
      "Your voice stays your voice — no sanitizing, no bureaucratizing",
      "First-person narrative is always preserved",
      "Emotional language is treated as data, not noise",
    ],
    whenHelpful: "Every time you add a new entry by voice. It runs automatically on every recording.",
    whenToDisable: "This is the core agent — it cannot be disabled. Without it, voice entries can't be processed.",
    status: "active",
    defaultEnabled: true,
    alwaysOn: true,
    settings: [],
    primaryModes: ["family", "mixed"],
  },
  {
    id: "pattern_recognition",
    name: "Pattern Recognition",
    archetype: "The Analyst",
    Icon: Compass,
    palette: { bg: "#f0f4f2", iconBg: "#dde8e4", iconColor: "#1e5040", accent: "#1e5040" },
    descriptor: "Maps the hidden connections between your belongings",
    description: "Reads across your entire inventory to find what you can't see from inside a single entry — collections that formed without anyone planning them, relationships between objects that never shared the same shelf.",
    principles: [
      "Patterns are observations, never verdicts",
      "Gaps and orphans are noted without shame",
      "Contradictions are surfaced, not smoothed over",
    ],
    whenHelpful: "When your inventory has grown to 10+ entries. Most useful after major cataloging sessions.",
    whenToDisable: "If you prefer to discover connections yourself, or find the insights distracting.",
    status: "available",
    defaultEnabled: false,
    settings: [
      {
        key: "frequency",
        label: "Analysis frequency",
        type: "select",
        options: ["Weekly", "Monthly", "On demand"],
        default: "Monthly",
      },
    ],
    primaryModes: ["family", "professional", "mixed"],
  },
  {
    id: "cartographer",
    name: "Cartographer",
    archetype: "The Cartographer",
    Icon: Globe,
    palette: { bg: "#eff6ff", iconBg: "#dbeafe", iconColor: "#1d4ed8", accent: "#1d4ed8" },
    descriptor: "Maps the geographic journeys of your belongings",
    description: "Reads the places woven through your inventory — where objects came from, where they traveled, how they clustered — and surfaces the geographic stories hidden in your collection.",
    principles: [
      "Geography reveals story, but story matters more than coordinates",
      "Place-based memory carries emotional weight — it is treated with care",
      "Displacement and diaspora are named honestly, never romanticized",
    ],
    whenHelpful: "When your inventory includes items from travels, inheritance, or moves across cities/countries. Most powerful with 10+ items that have origin places.",
    whenToDisable: "If you prefer to discover geographic patterns yourself, or if the geographic dimension of your collection isn't meaningful to you.",
    status: "available",
    defaultEnabled: false,
    settings: [
      {
        key: "minCluster",
        label: "Minimum cluster size",
        type: "select",
        options: ["2", "3", "5"],
        default: "2",
      },
    ],
    primaryModes: ["family", "professional", "mixed"],
  },
  {
    id: "transition_doula",
    name: "Transition Doula",
    archetype: "The Guide",
    Icon: LampDesk,
    palette: { bg: "#f4f2f0", iconBg: "#ecdde4", iconColor: "#661830", accent: "#661830" },
    descriptor: "Supports you through life changes and transitions",
    description: "When you're moving, downsizing, settling an estate, or simply releasing a chapter of your life — this agent helps you make thoughtful decisions about objects rather than rushed or regretted ones.",
    principles: [
      "Grief and gratitude both deserve space",
      "No urgency — the right pace is yours to set",
      "Questions, not prescriptions",
    ],
    whenHelpful: "During moves, downsizing, estate work, major life changes, or when preparing to give things away.",
    whenToDisable: "When you're in a stable period and not actively processing belongings.",
    status: "available",
    defaultEnabled: false,
    primaryModes: ["family", "mixed"],
    settings: [
      {
        key: "transitionType",
        label: "What are you navigating",
        type: "select",
        options: ["Death / inheritance", "Moving", "Downsizing", "Preparing my estate", "Divorce", "Other"],
        default: "Moving",
      },
      {
        key: "timelineUrgency",
        label: "Timeline",
        type: "select",
        options: ["Days", "Weeks", "Months", "No rush"],
        default: "Weeks",
      },
      {
        key: "supportStyle",
        label: "Support style",
        type: "select",
        options: ["Very gentle", "Balanced", "Practical focus"],
        default: "Balanced",
      },
      {
        key: "helpAvailable",
        label: "Who's helping you",
        type: "select",
        options: ["Solo", "Partner", "Family", "Hired help"],
        default: "Solo",
      },
    ],
  },
  {
    id: "lab_assistant",
    name: "Lab Assistant",
    archetype: "The Recorder",
    Icon: FlaskConical,
    palette: { bg: "#f0f4f8", iconBg: "#dde6f0", iconColor: "#2d5f8a", accent: "#2d5f8a" },
    descriptor: "Structures detailed notes for experiments, tests, and material exploration",
    description: "When enabled, Lab Notes becomes the default documentation style for new items in this inventory. You can always switch any individual item to Story or Lab mode from its add or edit page.",
    principles: [
      "Precision over poetry — exact details over emotional narrative",
      "Failure is data — document what didn't work as thoroughly as what did",
      "Variables matter — track what changed, what stayed constant, and why",
    ],
    whenHelpful: "When testing materials, iterating prototypes, tracking batches, developing recipes, or comparing products. Useful for artists, makers, researchers, product developers, and food developers.",
    whenToDisable: "If your inventory is primarily sentimental or narrative — items without technical specifications or comparative test data.",
    status: "available",
    defaultEnabled: false,
    primaryModes: ["professional", "mixed"],
    settings: [
      {
        key: "workType",
        label: "Type of work",
        type: "select",
        options: ["Art / craft", "Product development", "Research", "Food / recipe", "Small business", "General"],
        default: "General",
      },
      {
        key: "detail",
        label: "Extraction detail",
        type: "select",
        options: ["Minimal", "Standard", "Extensive"],
        default: "Standard",
      },
    ],
  },
  {
    id: "relationship_mapper",
    name: "Relationship Mapper",
    archetype: "The Genealogist",
    Icon: GitBranch,
    palette: { bg: "#f5f2ee", iconBg: "#e8e0d0", iconColor: "#5c3a1e", accent: "#5c3a1e" },
    descriptor: "Tracks the people and stories woven through your objects",
    description: "Builds a living record of who gave what, who used what, and who might inherit what — making the human layer of your inventory visible alongside the objects themselves.",
    principles: [
      "Objects carry people — both deserve to be named",
      "Relationships are tracked, not judged",
      "The map is always incomplete; that's honest",
    ],
    whenHelpful: "When your inventory includes inherited items, gifts, or objects meant for specific people.",
    whenToDisable: "If you prefer to keep the focus on objects rather than the people around them.",
    status: "coming_soon",
    defaultEnabled: false,
    settings: [],
    primaryModes: ["family", "mixed"],
  },
  {
    id: "memory_keeper",
    name: "Memory Keeper",
    archetype: "The Archivist",
    Icon: Bookmark,
    palette: { bg: "#f3f1f5", iconBg: "#e2ddf0", iconColor: "#342070", accent: "#342070" },
    descriptor: "Brings objects back into awareness at meaningful moments",
    description: "Surfaces forgotten entries at gentle intervals — not as reminders that something was missed, but as invitations to revisit. Objects often have more story in them than one sitting reveals.",
    principles: [
      "Timing is intentional, not algorithmic noise",
      "Resurfacing is an invitation, never a prompt",
      "The archivist is patient",
    ],
    whenHelpful: "For long-term archives, inherited collections, or any item where more story might emerge over time.",
    whenToDisable: "If you find periodic nudges disruptive or prefer to revisit items on your own schedule.",
    status: "coming_soon",
    defaultEnabled: false,
    settings: [],
    primaryModes: ["family", "mixed"],
  },
  {
    id: "organizational_coach",
    name: "Organizational Coach",
    archetype: "The Steward",
    Icon: Sprout,
    palette: { bg: "#f1f4f0", iconBg: "#deebd6", iconColor: "#30561e", accent: "#30561e" },
    descriptor: "Learns how you move through space and suggests what works for you",
    description: "Observes how you actually organize — your tag habits, your location vocabulary, your categorization instincts — and surfaces gentle suggestions that work with your patterns, not against them.",
    principles: [
      "Your system is valid — improvements build on it",
      "Suggestions are experiments, not corrections",
      "Never shame a tag or an empty field",
    ],
    whenHelpful: "When your inventory has grown unwieldy, or when you find yourself unable to locate things you've cataloged.",
    whenToDisable: "If your organizational style is intentionally idiosyncratic and you want to keep it that way.",
    status: "coming_soon",
    defaultEnabled: false,
    settings: [],
    primaryModes: ["family", "professional", "mixed"],
  },
];

// ── Toggle switch ──────────────────────────────────────────────────────
function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className="relative inline-flex items-center shrink-0 transition-colors"
      style={{
        width: 40,
        height: 22,
        borderRadius: 11,
        background: checked ? "var(--gold)" : "var(--parchment-dark)",
        border: "1px solid",
        borderColor: checked ? "var(--gold)" : "var(--border)",
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <span
        className="absolute transition-transform"
        style={{
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "var(--parchment-light)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
          transform: checked ? "translateX(20px)" : "translateX(2px)",
        }}
      />
    </button>
  );
}

// ── Agent card ─────────────────────────────────────────────────────────
function AgentCard({
  agent,
  enabled,
  agentSettings,
  onToggle,
  onSettingChange,
  children,
}: {
  agent: AgentDef;
  enabled: boolean;
  agentSettings: Record<string, string>;
  onToggle: (enabled: boolean) => void;
  onSettingChange: (key: string, value: string) => void;
  children?: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const isComingSoon = agent.status === "coming_soon";
  const { Icon, palette } = agent;

  return (
    <div
      className="flex flex-col"
      style={{
        border: "1px solid var(--border)",
        background: palette.bg,
        borderRadius: "8px",
        opacity: isComingSoon ? 0.65 : 1,
      }}
    >
      {/* Main area */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div
            className="shrink-0 flex items-center justify-center"
            style={{ width: 46, height: 46, borderRadius: "50%", background: palette.iconBg, border: "1px solid var(--border)" }}
          >
            <Icon className="w-5 h-5" style={{ color: palette.iconColor }} />
          </div>

          {/* Archetype + name + badges */}
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-serif font-semibold text-base" style={{ color: "var(--ink)" }}>
                {agent.archetype}
              </h3>
              {agent.alwaysOn && (
                <span className="text-[9px] px-1.5 py-0.5 font-semibold tracking-wide uppercase"
                  style={{ background: palette.iconBg, color: palette.accent, border: `1px solid ${palette.iconBg}`, borderRadius: "3px" }}>
                  Core
                </span>
              )}
              {isComingSoon && (
                <span className="text-[9px] px-1.5 py-0.5 font-semibold tracking-wide uppercase"
                  style={{ background: "var(--parchment-dark)", color: "var(--ink-light)", border: "1px solid var(--border)", borderRadius: "3px" }}>
                  Coming soon
                </span>
              )}
            </div>
            <p className="text-[10px] mt-0.5 italic" style={{ color: palette.accent }}>
              {agent.name}
            </p>
          </div>

          {/* Toggle */}
          <div className="shrink-0 mt-1">
            <Toggle checked={enabled} onChange={onToggle} disabled={agent.alwaysOn || isComingSoon} />
          </div>
        </div>

        {/* Descriptor */}
        <p className="text-xs mt-3 leading-relaxed" style={{ color: "var(--ink-mid)" }}>
          {agent.descriptor}
        </p>
      </div>

      {/* Expandable section */}
      <div style={{ borderTop: "1px solid var(--border)" }}>
        <button
          onClick={() => setExpanded((e) => !e)}
          className="w-full flex items-center justify-between px-4 py-2.5 text-xs transition-opacity hover:opacity-70"
          style={{ color: "var(--ink-light)" }}
        >
          <span>Learn more</span>
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {expanded && (
          <div className="px-4 pb-4 space-y-4">
            {/* Full description */}
            <p className="text-xs leading-relaxed font-serif" style={{ color: "var(--ink)" }}>
              {agent.description}
            </p>

            {/* Principles */}
            <div>
              <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-2" style={{ color: palette.accent }}>
                Principles
              </p>
              <ul className="space-y-1">
                {agent.principles.map((p, i) => (
                  <li key={i} className="text-xs flex gap-2" style={{ color: "var(--ink-mid)" }}>
                    <span style={{ color: palette.accent }}>—</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>

            {/* When helpful / when to disable */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-1" style={{ color: palette.accent }}>
                  When it helps
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                  {agent.whenHelpful}
                </p>
              </div>
              <div>
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-1" style={{ color: "var(--ink-light)" }}>
                  When to disable
                </p>
                <p className="text-xs leading-relaxed" style={{ color: "var(--ink-mid)" }}>
                  {agent.whenToDisable}
                </p>
              </div>
            </div>

            {/* Settings */}
            {agent.settings.length > 0 && enabled && (
              <div className="space-y-3">
                <div className="h-px" style={{ background: "var(--border)" }} />
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold" style={{ color: palette.accent }}>
                  Configuration
                </p>
                {agent.settings.map((setting) => (
                  <div key={setting.key} className="flex items-center justify-between gap-4">
                    <label className="text-xs" style={{ color: "var(--ink-mid)" }}>
                      {setting.label}
                    </label>
                    <select
                      value={agentSettings[setting.key] ?? setting.default}
                      onChange={(e) => onSettingChange(setting.key, e.target.value)}
                      className="text-xs px-2 py-1 focus:outline-none"
                      style={{ background: "var(--parchment)", border: "1px solid var(--border)", color: "var(--ink)", borderRadius: "4px" }}
                    >
                      {setting.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}

            {/* Slot for Pattern Recognition insights panel */}
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, loading: authLoading } = useAuthContext();
  const { runTour, finishTour, replayTour, resetOnboarding } = useOnboarding(user?.uid ?? null);
  const { currentInventory } = useInventoryContext();
  const { items } = useInventory(currentInventory?.id ?? null);

  const [prefs, setPrefs] = useState<UserAgentPreferences>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [patternResult, setPatternResult] = useState<PatternRecognitionResult | null>(null);
  const [patternRunning, setPatternRunning] = useState(false);
  const [cartResult, setCartResult] = useState<CartographicResult | null>(null);
  const [cartRunning, setCartRunning] = useState(false);
  const [transitionData, setTransitionData] = useState<TransitionDoulaData | null>(null);
  const [transitionRunning, setTransitionRunning] = useState(false);
  const [labResult, setLabResult] = useState<LabAssistantResult | null>(null);
  const [labRunning, setLabRunning] = useState(false);
  const [showAllAgents, setShowAllAgents] = useState(false);
  const [savingMode, setSavingMode] = useState(false);

  // Load agent prefs + existing insights
  useEffect(() => {
    if (!user) return;
    Promise.all([
      getAgentPreferences(user.uid),
      getPatternInsights(user.uid),
      getCartographerInsights(user.uid),
      getTransitionDoulaData(user.uid),
      getLabAssistantResult(user.uid),
    ]).then(([savedPrefs, savedInsights, savedCart, savedTransition, savedLab]) => {
      const merged: UserAgentPreferences = {};
      for (const agent of AGENTS) {
        merged[agent.id] = savedPrefs[agent.id] ?? {
          enabled: agent.defaultEnabled,
          settings: Object.fromEntries(agent.settings.map((s) => [s.key, s.default])),
        };
      }
      setPrefs(merged);
      if (savedInsights) setPatternResult(savedInsights);
      if (savedCart) setCartResult(savedCart);
      setTransitionData(savedTransition);
      if (savedLab) setLabResult(savedLab);
    }).finally(() => setLoading(false));
  }, [user]);

  async function handleToggle(agentId: AgentId, enabled: boolean) {
    const updated = {
      ...prefs,
      [agentId]: { ...prefs[agentId], enabled, settings: prefs[agentId]?.settings ?? {} },
    };
    setPrefs(updated);
    setSaving(true);
    try {
      await saveAgentPreferences(user!.uid, updated);
      toast.success(enabled ? "Agent enabled" : "Agent disabled");
    } catch {
      toast.error("Failed to save preferences");
      setPrefs(prefs);
    } finally {
      setSaving(false);
    }
  }

  async function handleSettingChange(agentId: AgentId, key: string, value: string) {
    const updated = {
      ...prefs,
      [agentId]: {
        ...prefs[agentId],
        enabled: prefs[agentId]?.enabled ?? false,
        settings: { ...prefs[agentId]?.settings, [key]: value },
      },
    };
    setPrefs(updated);
    setSaving(true);
    try {
      await saveAgentPreferences(user!.uid, updated);
    } catch {
      toast.error("Failed to save setting");
    } finally {
      setSaving(false);
    }
  }

  const runPatternRecognition = useCallback(async (showAll: boolean) => {
    if (!currentInventory || items.length === 0) {
      toast.error("No inventory items to analyze yet.");
      return;
    }
    setPatternRunning(true);
    try {
      const res = await fetch("/api/agents/pattern-recognition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, inventoryId: currentInventory.id, showAll }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();

      const newInsights: PatternInsight[] = data.insights ?? [];
      if (newInsights.length === 0) {
        toast("No new patterns found — your inventory may need more entries.", { icon: "🔍" });
        return;
      }

      // Merge new insights with existing, keeping dismissed state
      const existing = patternResult?.insights ?? [];
      const merged = [
        ...newInsights,
        ...existing.filter((e) => e.dismissed), // keep dismissed ones
      ];

      const result: PatternRecognitionResult = {
        insights: merged,
        lastRunAt: new Date(),
        inventoryId: currentInventory.id,
      };
      setPatternResult(result);
      await savePatternInsights(user!.uid, result);
      toast.success(`${newInsights.length} ${newInsights.length === 1 ? "pattern" : "patterns"} found`);
    } catch {
      toast.error("Pattern analysis failed — try again later");
    } finally {
      setPatternRunning(false);
    }
  }, [currentInventory, items, patternResult, user]);

  async function handleDismiss(insightId: string) {
    if (!patternResult || !user) return;
    const updated: PatternRecognitionResult = {
      ...patternResult,
      insights: patternResult.insights.map((i) =>
        i.id === insightId ? { ...i, dismissed: true } : i
      ),
    };
    setPatternResult(updated);
    await dismissPatternInsight(user.uid, insightId);
  }

  const runCartographer = useCallback(async (showAll: boolean) => {
    if (!currentInventory || items.length === 0) {
      toast.error("No inventory items to analyze yet.");
      return;
    }
    setCartRunning(true);
    try {
      const res = await fetch("/api/agents/cartographer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, inventoryId: currentInventory.id, showAll }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();

      const newInsights: CartographicInsight[] = data.insights ?? [];
      if (newInsights.length === 0) {
        toast("No geographic patterns found yet — add more items with origin places.", { icon: "🗺️" });
        return;
      }

      const existing = cartResult?.insights ?? [];
      const merged = [
        ...newInsights,
        ...existing.filter((e) => e.dismissed),
      ];

      const result: CartographicResult = {
        insights: merged,
        lastRunAt: new Date(),
        inventoryId: currentInventory.id,
      };
      setCartResult(result);
      await saveCartographerInsights(user!.uid, result);
      toast.success(`${newInsights.length} geographic ${newInsights.length === 1 ? "pattern" : "patterns"} found`);
    } catch {
      toast.error("Cartographer analysis failed — try again later");
    } finally {
      setCartRunning(false);
    }
  }, [currentInventory, items, cartResult, user]);

  async function handleCartDismiss(insightId: string) {
    if (!cartResult || !user) return;
    const updated: CartographicResult = {
      ...cartResult,
      insights: cartResult.insights.map((i) =>
        i.id === insightId ? { ...i, dismissed: true } : i
      ),
    };
    setCartResult(updated);
    await dismissCartographerInsight(user.uid, insightId);
  }

  const runTransitionDoula = useCallback(async (context: "morning" | "evening" | "overwhelmed" | "refresh") => {
    if (!user) return;
    const config = prefs["transition_doula"]?.settings ?? {};
    setTransitionRunning(true);
    try {
      const recentItems = items.slice(0, 5).map((i) => ({ name: i.name, tags: i.tags }));
      const res = await fetch("/api/agents/transition-doula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          config: {
            transitionType: config.transitionType ?? "Moving",
            timelineUrgency: config.timelineUrgency ?? "Weeks",
            supportStyle: config.supportStyle ?? "Balanced",
            helpAvailable: config.helpAvailable ?? "Solo",
          },
          itemCount: items.length,
          recentItems,
          decideLaterCount: transitionData?.decideLaterItems.length ?? 0,
          context,
        }),
      });
      if (!res.ok) throw new Error("Guidance failed");
      const data = await res.json();
      const insight: TransitionInsight = {
        ...data.insight,
        id: `${Date.now()}`,
        generatedAt: new Date(),
        context,
      };
      await saveTransitionGuidance(user.uid, insight);
      setTransitionData((prev) => ({ ...(prev ?? { decideLaterItems: [], lastCheckInAt: null }), currentGuidance: insight }));
    } catch {
      toast.error("Couldn't reach the Doula — try again in a moment");
    } finally {
      setTransitionRunning(false);
    }
  }, [user, prefs, items, transitionData]);

  async function handleAddDecideLater(name: string) {
    if (!user) return;
    const updated = await addDecideLaterItem(user.uid, name);
    setTransitionData((prev) => ({ ...(prev ?? { currentGuidance: null, lastCheckInAt: null }), decideLaterItems: updated }));
  }

  async function handleRemoveDecideLater(itemId: string) {
    if (!user) return;
    const updated = await removeDecideLaterItem(user.uid, itemId);
    setTransitionData((prev) => ({ ...(prev ?? { currentGuidance: null, lastCheckInAt: null }), decideLaterItems: updated }));
  }

  const runLabAssistant = useCallback(async () => {
    if (!currentInventory || items.length === 0) {
      toast.error("No inventory items to analyze yet.");
      return;
    }
    setLabRunning(true);
    try {
      const workType = prefs["lab_assistant"]?.settings?.workType ?? "General";
      const res = await fetch("/api/agents/lab-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items, inventoryId: currentInventory.id, workType }),
      });
      if (!res.ok) throw new Error("Analysis failed");
      const data = await res.json();

      const newNotes: LabNote[] = (data.notes ?? []).map((n: LabNote) => ({
        ...n,
        generatedAt: new Date(),
      }));

      if (newNotes.length === 0) {
        toast("No lab-relevant items found — add items with specs, test conditions, or experimental notes.", { icon: "🔬" });
        return;
      }

      const existing = labResult?.notes ?? [];
      const merged = [
        ...newNotes,
        ...existing.filter((e) => e.dismissed),
      ];

      const result: LabAssistantResult = {
        notes: merged,
        lastRunAt: new Date(),
        inventoryId: currentInventory.id,
      };
      setLabResult(result);
      await saveLabAssistantResult(user!.uid, result);
      toast.success(`${newNotes.length} lab ${newNotes.length === 1 ? "note" : "notes"} extracted`);
    } catch {
      toast.error("Lab analysis failed — try again later");
    } finally {
      setLabRunning(false);
    }
  }, [currentInventory, items, labResult, prefs, user]);

  async function handleLabDismiss(noteId: string) {
    if (!labResult || !user) return;
    const updated: LabAssistantResult = {
      ...labResult,
      notes: labResult.notes.map((n) =>
        n.id === noteId ? { ...n, dismissed: true } : n
      ),
    };
    setLabResult(updated);
    await dismissLabNote(user.uid, noteId);
  }

  if (authLoading || (user && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--parchment)" }}>
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
      </div>
    );
  }

  if (!user) return <LoginForm />;

  const patternEnabled = prefs["pattern_recognition"]?.enabled ?? false;
  const cartEnabled = prefs["cartographer"]?.enabled ?? false;
  const transitionEnabled = prefs["transition_doula"]?.enabled ?? false;
  const labEnabled = prefs["lab_assistant"]?.enabled ?? false;

  // Mode-aware agent ordering and filtering
  const mode: InventoryMode = currentInventory?.mode ?? "mixed";
  const modeMeta = MODE_META[mode];
  const primaryAgents = AGENTS.filter((a) => a.primaryModes.includes(mode));
  const secondaryAgents = AGENTS.filter((a) => !a.primaryModes.includes(mode));

  async function handleModeChange(newMode: InventoryMode) {
    if (!currentInventory) return;
    setSavingMode(true);
    try {
      await updateInventoryMode(currentInventory.id, newMode);
      toast.success(`Mode updated to ${MODE_META[newMode].label}`);
    } catch {
      toast.error("Failed to update mode");
    } finally {
      setSavingMode(false);
    }
  }

  function renderAgentPanel(agent: AgentDef) {
    return (
      <AgentCard
        key={agent.id}
        agent={agent}
        enabled={prefs[agent.id]?.enabled ?? agent.defaultEnabled}
        agentSettings={prefs[agent.id]?.settings ?? {}}
        onToggle={(enabled) => handleToggle(agent.id, enabled)}
        onSettingChange={(key, value) => handleSettingChange(agent.id, key, value)}
      >
        {agent.id === "pattern_recognition" && patternEnabled && (
          <PatternInsightsPanel
            insights={patternResult?.insights ?? []}
            lastRunAt={patternResult?.lastRunAt ?? null}
            running={patternRunning}
            onRunSingle={() => runPatternRecognition(false)}
            onRunAll={() => runPatternRecognition(true)}
            onDismiss={handleDismiss}
          />
        )}
        {agent.id === "pattern_recognition" && !patternEnabled && (
          <p className="text-xs italic mt-2" style={{ color: "var(--ink-light)" }}>
            Enable Pattern Recognition above to run an analysis.
          </p>
        )}

        {agent.id === "cartographer" && cartEnabled && (
          <CartographerInsightsPanel
            insights={cartResult?.insights ?? []}
            lastRunAt={cartResult?.lastRunAt ?? null}
            running={cartRunning}
            onRunSingle={() => runCartographer(false)}
            onRunAll={() => runCartographer(true)}
            onDismiss={handleCartDismiss}
          />
        )}
        {agent.id === "cartographer" && !cartEnabled && (
          <p className="text-xs italic mt-2" style={{ color: "var(--ink-light)" }}>
            Enable the Cartographer above to map your objects&apos; geographic journeys.
          </p>
        )}

        {agent.id === "transition_doula" && transitionEnabled && (
          <TransitionDoulaPanel
            data={transitionData}
            running={transitionRunning}
            onRequestGuidance={runTransitionDoula}
            onAddDecideLater={handleAddDecideLater}
            onRemoveDecideLater={handleRemoveDecideLater}
          />
        )}
        {agent.id === "transition_doula" && !transitionEnabled && (
          <p className="text-xs italic mt-2" style={{ color: "var(--ink-light)" }}>
            Enable the Transition Doula above, then configure your situation to get started.
          </p>
        )}

        {agent.id === "lab_assistant" && labEnabled && (
          <LabAssistantPanel
            result={labResult}
            running={labRunning}
            onRun={runLabAssistant}
            onDismiss={handleLabDismiss}
          />
        )}
        {agent.id === "lab_assistant" && !labEnabled && (
          <p className="text-xs italic mt-2" style={{ color: "var(--ink-light)" }}>
            Enable Lab Assistant to set Lab Notes as the default style for new items. You can still choose per-item on the add page.
          </p>
        )}
      </AgentCard>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--parchment)" }}>
      <OnboardingTour run={runTour} onFinish={finishTour} />
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-8">

        {/* Page header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkles className="w-4 h-4" style={{ color: "var(--gold)" }} />
            <p className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "var(--ink-light)" }}>
              Intelligence Layer
            </p>
            <Sparkles className="w-4 h-4" style={{ color: "var(--gold)" }} />
          </div>
          <h1 className="font-serif text-2xl font-bold" style={{ color: "var(--ink)" }}>
            Agents
          </h1>
          <p className="text-sm mt-2 max-w-sm mx-auto leading-relaxed" style={{ color: "var(--ink-mid)" }}>
            Agents work quietly in the background, helping you build a richer, more meaningful archive.
          </p>
          <div className="flex items-center gap-3 justify-center mt-4">
            <div className="h-px w-16" style={{ background: "var(--border)" }} />
            <span className="text-xs" style={{ color: "var(--gold)" }}>✦</span>
            <div className="h-px w-16" style={{ background: "var(--border)" }} />
          </div>
        </div>

        {/* ── Inventory mode section ─────────────────────────────────── */}
        {currentInventory && (
          <div
            className="mb-6 p-4 rounded-xl"
            style={{ border: "1px solid var(--border)", background: "var(--parchment-light)" }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-1" style={{ color: "var(--ink-light)" }}>
                  Inventory mode
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{modeMeta.icon}</span>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>{modeMeta.label}</p>
                    <p className="text-xs" style={{ color: "var(--ink-mid)" }}>{modeMeta.tagline}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Mode switcher */}
            <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--border)" }}>
              <p className="text-[9px] tracking-[0.2em] uppercase font-semibold mb-2" style={{ color: "var(--ink-light)" }}>
                Change mode
              </p>
              <div className="flex gap-2 flex-wrap">
                {(["family", "professional", "mixed"] as InventoryMode[]).map((m) => {
                  const meta = MODE_META[m];
                  const isActive = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => !isActive && handleModeChange(m)}
                      disabled={savingMode || isActive}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-opacity"
                      style={{
                        borderRadius: "8px",
                        border: `1px solid ${isActive ? meta.accent : "var(--border)"}`,
                        background: isActive ? meta.accentLight : "var(--parchment)",
                        color: isActive ? meta.accent : "var(--ink-mid)",
                        opacity: savingMode && !isActive ? 0.5 : 1,
                        cursor: isActive ? "default" : "pointer",
                      }}
                    >
                      <span className="text-base leading-none">{meta.icon}</span>
                      {m === "family" ? "Family & Memory" : m === "professional" ? "Professional" : "Mixed"}
                    </button>
                  );
                })}
              </div>
              {secondaryAgents.length > 0 && mode !== "mixed" && (
                <p className="text-[10px] mt-2 leading-relaxed" style={{ color: "var(--ink-light)" }}>
                  {secondaryAgents.length} agent{secondaryAgents.length !== 1 ? "s" : ""} hidden in this mode.{" "}
                  <button
                    onClick={() => setShowAllAgents((v) => !v)}
                    className="underline transition-opacity hover:opacity-70"
                    style={{ color: "var(--ink-mid)" }}
                  >
                    {showAllAgents ? "Hide them" : "Show all agents"}
                  </button>
                </p>
              )}
            </div>
          </div>
        )}

        {(saving || savingMode) && (
          <div className="flex items-center justify-center gap-2 mb-4 text-xs" style={{ color: "var(--ink-light)" }}>
            <div className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "var(--gold)", borderTopColor: "transparent" }} />
            Saving…
          </div>
        )}

        {/* Agent cards — primary for this mode */}
        <div className="space-y-3">
          {primaryAgents.map(renderAgentPanel)}
        </div>

        {/* Secondary agents — hidden by default in non-mixed modes */}
        {secondaryAgents.length > 0 && (mode === "mixed" || showAllAgents) && (
          <div className="mt-6 space-y-3">
            {mode !== "mixed" && (
              <div className="flex items-center gap-3">
                <div className="h-px flex-1" style={{ background: "var(--border)" }} />
                <p className="text-[9px] tracking-[0.2em] uppercase font-semibold shrink-0" style={{ color: "var(--ink-light)" }}>
                  Other agents
                </p>
                <div className="h-px flex-1" style={{ background: "var(--border)" }} />
              </div>
            )}
            {secondaryAgents.map(renderAgentPanel)}
          </div>
        )}

        <p className="text-center text-xs mt-8" style={{ color: "var(--ink-light)" }}>
          More agents are in development. Each one is designed to deepen the archive, not automate it.
        </p>

        {/* Replay tour */}
        <div className="flex justify-center gap-6 mt-6">
          <button
            onClick={replayTour}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-light)" }}
          >
            ↺ Replay tour
          </button>
          <button
            onClick={resetOnboarding}
            className="text-xs transition-opacity hover:opacity-70"
            style={{ color: "var(--ink-light)" }}
          >
            ↺ Reset onboarding
          </button>
        </div>
      </main>
    </div>
  );
}

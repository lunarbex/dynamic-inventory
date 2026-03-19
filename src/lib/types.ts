export type ConfirmationMode = "auto" | "ask" | "manual";

export type MemberRole = "admin" | "contributor" | "viewer";

export interface InventoryMember {
  userId: string;
  email: string;
  displayName?: string;
  role: MemberRole;
  joinedAt: Date;
}

export interface InventoryBook {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  memberIds: string[];                        // for array-contains queries
  members: Record<string, InventoryMember>;   // keyed by userId
  settings?: {
    agentEnabled?: boolean;
    customChapters?: CustomChapter[];
  };
}

export const ACTIVITY_ZONES = [
  { id: "edible", label: "Edible Nourishment", icon: "🥗" },
  { id: "kitchen", label: "Kitchen", icon: "🍳" },
  { id: "sleep", label: "Sleep", icon: "🛏" },
  { id: "body_care", label: "Body Care", icon: "🧴" },
  { id: "library", label: "Library", icon: "📚" },
  { id: "notes", label: "Notes & Documents", icon: "📝" },
  { id: "clothing", label: "Clothing", icon: "👕" },
  { id: "tools", label: "Tools & Repair", icon: "🔧" },
  { id: "art", label: "Art & Making", icon: "🎨" },
  { id: "digital", label: "Digital Assets", icon: "💻" },
  { id: "electronics", label: "Electronics & Tech", icon: "🔌" },
  { id: "outdoor", label: "Outdoor & Garden", icon: "🌿" },
  { id: "kids", label: "Future Kids", icon: "🧸" },
  { id: "memory", label: "Memory & Heirlooms", icon: "🏺" },
  { id: "office", label: "Office & Admin", icon: "📋" },
  { id: "other", label: "Other", icon: "📦" },
] as const;

export type ActivityZoneId = (typeof ACTIVITY_ZONES)[number]["id"];

export interface OriginPlace {
  name: string;       // human-readable place name
  lat?: number;
  lng?: number;
}

export interface CustomChapter {
  id: string;
  name: string;
  icon?: string;
  filterTags?: string[];
  filterCategories?: ActivityZoneId[];
  filterPassTo?: string;
}

export interface InventoryItem {
  id: string;
  inventoryId: string;
  name: string;
  description: string;
  story: string;
  provenance: string;
  categories: ActivityZoneId[];

  // Three location types
  microLocation: string;  // specific spot: "kitchen drawer 2", "closet top shelf"
  macroLocation: string;  // city/region: "San Francisco, CA"
  originPlace: OriginPlace; // where acquired, used for map

  // Legacy field — kept for any existing docs
  location?: string;

  photos: string[];       // Firebase Storage URLs
  audioUrl?: string;      // original voice recording in Firebase Storage
  voiceTranscript: string;
  tags: string[];         // free-form user-defined tags

  // Provenance / social fields
  passTo: string;         // who might inherit/receive
  isLoanable: boolean;    // can friends borrow?
  condition: string;      // current state

  addedBy: string;
  addedByEmail: string;
  addedByName: string;
  addedAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  updatedByEmail?: string;
  confirmationMode: ConfirmationMode;
  autoConfirmAfterEntry?: number;

  // V2 collection hierarchy — stored now, UI built later
  collectionId: string | null;  // parent collection item's ID, or null
  isCollection: boolean;        // true if this item is itself a container
}

export interface UserStats {
  uid: string;
  totalEntries: number;
  confirmationMode: ConfirmationMode;
  autoConfirmThreshold?: number;
}

// ── Agent system ──────────────────────────────────────────────────────
export type AgentId =
  | "story_listener"
  | "pattern_recognition"
  | "cartographer"
  | "transition_doula"
  | "relationship_mapper"
  | "memory_keeper"
  | "organizational_coach";

export interface AgentPreference {
  enabled: boolean;
  settings: Record<string, string>;
}

export type UserAgentPreferences = Partial<Record<AgentId, AgentPreference>>;

export type PatternType =
  | "collection"
  | "relationship"
  | "gap"
  | "temporal"
  | "spatial"
  | "scattered_collection"
  | "distributed_category"
  | "recipient_organization";
export type PatternConfidence = "high" | "medium" | "low";

export interface PatternInsight {
  id: string;
  type: PatternType;
  insight: string;
  affectedItems: string[];
  suggestedAction: string | null;
  confidence: PatternConfidence;
  generatedAt: Date;
  dismissed?: boolean;
}

export interface OnboardingState {
  hasSeenWelcome: boolean;
  hasCompletedTour: boolean;
  hasAddedFirstItem: boolean;
}

export interface PatternRecognitionResult {
  insights: PatternInsight[];
  lastRunAt: Date;
  inventoryId: string;
}

// ── Cartographer agent ─────────────────────────────────────────────────────
export type CartographyType = "cluster" | "journey" | "diaspora" | "gap" | "complement";

export interface CartographicPlace {
  name: string;
  lat?: number;
  lng?: number;
}

export interface CartographicInsight {
  id: string;
  type: CartographyType;
  insight: string;
  places: CartographicPlace[];
  affectedItems: string[];
  suggestedAction: string | null;
  confidence: PatternConfidence;
  generatedAt: Date;
  dismissed?: boolean;
}

export interface CartographicResult {
  insights: CartographicInsight[];
  lastRunAt: Date;
  inventoryId: string;
}

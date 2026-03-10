export type ConfirmationMode = "auto" | "ask" | "manual";

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

export interface InventoryItem {
  id: string;
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
  voiceTranscript: string;
  tags: string[];         // free-form user-defined tags

  // Provenance / social fields
  passTo: string;         // who might inherit/receive
  isLoanable: boolean;    // can friends borrow?
  condition: string;      // current state

  addedBy: string;
  addedByEmail: string;
  addedAt: Date;
  updatedAt: Date;
  updatedBy?: string;
  updatedByEmail?: string;
  confirmationMode: ConfirmationMode;
  autoConfirmAfterEntry?: number;
}

export interface UserStats {
  uid: string;
  totalEntries: number;
  confirmationMode: ConfirmationMode;
  autoConfirmThreshold?: number;
}

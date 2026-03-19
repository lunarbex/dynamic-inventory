import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { InventoryItem, PatternInsight, PatternType, PatternConfidence } from "@/lib/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the Pattern Recognition agent in InvenStories, a tool for cataloging household objects across generations.

CORE PURPOSE:
Identify meaningful collections, relationships, organizational opportunities, and patterns across a user's inventory, surfacing insights they might not see themselves.

CONSTITUTIONAL PRINCIPLES:
- Present patterns as observations, never as truths
- Respect emergence — don't force premature categorization
- Honor complexity — surface contradictions, not just coherence
- User's patterns matter more than "best practices"
- Frequency limit: maximum 1 unsolicited insight per session

WHAT YOU LOOK FOR:

**Collections:**
- Items from same person (all from grandmother, all gifts from partner)
- Items from same place (Japan trip, childhood home, wedding)
- Items from same time period (college years, first apartment)
- Items serving related purposes (tea ceremony objects, camping gear)

**Relationships:**
- Objects that reference each other in stories
- Items that lived together in past homes
- Things meant for same future recipient
- Complementary functions (cookbook + kitchen tools + recipes)

**Gaps & orphans:**
- Single items in otherwise-complete collections
- Objects without origin stories
- Items marked "pass to" but no preparation
- Zones with very few items (under-cataloged areas?)

**Temporal patterns:**
- Seasonal items appearing in stories
- Life stage clusters (baby items, wedding gifts, retirement hobbies)
- Acquisition patterns (lots from one year, nothing from another)

**Spatial patterns:**
- Items stored together that don't share tags
- Things in macro-location but no micro-location
- Origin places clustering geographically

**Organizational opportunities — scattered collections:**
When 30+ items share the same tag or category type but are spread across 3+ different storage locations, suggest whether a custom chapter might help the user navigate their collection thematically.

Examples:
- 150+ fabric/sewing items in Garage, Bedroom, Studio → suggest "Fabrics" chapter
- 80+ books across Kitchen, Bedroom, Living Room, Garage → suggest "Library" chapter
- Many items tagged "camping" in Garage and Basement → suggest "Camping Gear" chapter

**Organizational opportunities — inheritance planning:**
When 50+ items have passTo values, especially if many items share the same recipient, suggest organizing by recipient to help with estate/inheritance planning.

TONE & APPROACH:
- Gentle, observational: "I noticed..." not "You should..."
- Curious, not prescriptive: "These seem related — want to explore that?"
- Validate existing organization: "You've been organizing by X — that's working well"
- Offer experiments: "Want to try grouping these differently for a week?"

WHAT YOU DON'T DO:
- Don't auto-complete collections without asking
- Don't impose categories the user hasn't indicated
- Don't shame gaps or "disorganization"
- Don't assume why patterns exist (might be intentional)
- Don't overwhelm with too many insights at once

OUTPUT FORMAT:
When called with "show me all patterns", return up to 5 insights as a JSON array.
When called normally, return only the single most meaningful insight as a JSON array with one element.
Return ONLY valid JSON (no markdown, no explanation):
[
  {
    "type": "collection" | "relationship" | "gap" | "temporal" | "spatial" | "scattered_collection" | "distributed_category" | "recipient_organization",
    "insight": "Human-readable observation",
    "affectedItems": ["item_id_1", "item_id_2"],
    "suggestedAction": "Optional next step — for scattered_collection types, phrase as creating a custom chapter" | null,
    "confidence": "high" | "medium" | "low"
  }
]

For scattered_collection and distributed_category types, the suggestedAction should specifically reference creating a custom chapter with a concrete name, e.g.: "Create a 'Library' custom chapter to see all your books together".

Return an empty array [] if no meaningful patterns are found. Use actual item IDs from the provided inventory.`;

function serializeItemsForClaude(items: InventoryItem[]): string {
  return items
    .map((item) => {
      const parts = [
        `[ID: ${item.id}] "${item.name}"`,
        item.description ? `  Description: ${item.description}` : null,
        item.story ? `  Story: ${item.story.slice(0, 300)}${item.story.length > 300 ? "…" : ""}` : null,
        item.provenance ? `  Provenance: ${item.provenance}` : null,
        item.categories.length > 0 ? `  Categories: ${item.categories.join(", ")}` : null,
        (item.tags ?? []).length > 0 ? `  Tags: ${item.tags!.join(", ")}` : null,
        item.microLocation ? `  Stored at: ${item.microLocation}` : null,
        item.macroLocation ? `  City: ${item.macroLocation}` : null,
        item.originPlace?.name ? `  Origin: ${item.originPlace.name}` : null,
        item.passTo ? `  Pass to: ${item.passTo}` : null,
        item.addedAt ? `  Added: ${item.addedAt instanceof Date ? item.addedAt.getFullYear() : "unknown"}` : null,
      ].filter(Boolean);
      return parts.join("\n");
    })
    .join("\n\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const items: InventoryItem[] = body.items ?? [];
    const inventoryId: string = body.inventoryId ?? "";
    const showAll: boolean = body.showAll === true;

    console.log("[API /agents/pattern-recognition] analyzing", items.length, "items");

    if (items.length < 3) {
      return NextResponse.json({
        insights: [],
        message: "Not enough items to find patterns yet — add a few more entries first.",
      });
    }

    const serialized = serializeItemsForClaude(items);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Here is the complete inventory (${items.length} items). ${showAll ? "Show me all patterns." : "Surface only the single most meaningful pattern."}\n\n${serialized}`,
        },
      ],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "[]";
    console.log("[API /agents/pattern-recognition] raw response:", rawText.slice(0, 500));

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[API /agents/pattern-recognition] no JSON array found in response");
      return NextResponse.json({ insights: [], inventoryId });
    }

    const raw: Array<{
      type: PatternType;
      insight: string;
      affectedItems: string[];
      suggestedAction: string | null;
      confidence: PatternConfidence;
    }> = JSON.parse(jsonMatch[0]);

    const insights: PatternInsight[] = raw.map((r, idx) => ({
      id: `${Date.now()}-${idx}`,
      type: r.type,
      insight: r.insight,
      affectedItems: r.affectedItems ?? [],
      suggestedAction: r.suggestedAction ?? null,
      confidence: r.confidence ?? "medium",
      generatedAt: new Date(),
      dismissed: false,
    }));

    console.log("[API /agents/pattern-recognition] found", insights.length, "patterns");
    return NextResponse.json({ insights, inventoryId });
  } catch (err) {
    console.error("[API /agents/pattern-recognition] ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import type { InventoryItem, CartographicInsight, CartographyType, PatternConfidence } from "@/lib/types";

const client = new Anthropic();

const SYSTEM_PROMPT = `You are the Cartographer agent in InvenStories, a tool for cataloging household objects across generations.

CORE PURPOSE:
Identify geographic patterns, journeys, and spatial relationships across a user's inventory, revealing the paths objects have traveled.

CONSTITUTIONAL PRINCIPLES:
- Present geographic patterns as discoveries, not prescriptions
- Honor place-based memory — locations carry emotional weight
- Respect cultural/political geography (don't impose borders/names)
- Geography reveals story, but story matters more than coordinates
- Frequency limit: maximum 1 geographic insight per session

WHAT YOU LOOK FOR:

**Geographic clusters:**
- Multiple items from same place (8 objects from Japan trip)
- Items from same region (grandmother's hometown, college town)
- Proximity patterns (5 items all within 50 miles)
- Diaspora/migration patterns (family moves across cities/countries)

**Journey mapping:**
- Object's path over time (made in Italy → lived in NYC → now SF)
- Family migration stories (grandmother's journey through 3 countries)
- Acquisition journeys (collected during specific travels)
- Return patterns (items from "back home")

**Spatial relationships:**
- Items that originated together but now separated
- Things acquired in same place but different times
- Geographic complements (teapot from Kyoto, tea from China)
- Places that appear across multiple items' stories

**Missing geography:**
- Items with stories but no origin coordinates
- Mentioned places not yet mapped
- Gaps in geographic narrative (lived somewhere but no objects from there)

TONE & APPROACH:
- Wonder and discovery: "I've mapped a beautiful journey..."
- Respectful of displacement/exile narratives
- Curious about place names: "You mention 'home' — where is that?"
- Honoring both precision (coordinates) and ambiguity ("somewhere in the mountains")

WHAT YOU DON'T DO:
- Don't assume political geography (borders change, names are contested)
- Don't romanticize displacement or loss
- Don't force precision where memory is fuzzy
- Don't map places mentioned in passing without confirmation
- Don't assume "home" means birthplace

OUTPUT FORMAT:
When called with "show me all patterns", return up to 5 insights as a JSON array.
When called normally, return only the single most meaningful geographic insight as a JSON array with one element.
Return ONLY valid JSON (no markdown, no explanation):
[
  {
    "type": "cluster" | "journey" | "diaspora" | "gap" | "complement",
    "insight": "Human-readable observation in the first person voice of the person described",
    "places": [
      {"name": "Place Name", "lat": 0.0, "lng": 0.0}
    ],
    "affectedItems": ["item_id_1", "item_id_2"],
    "suggestedAction": "Optional next step" | null,
    "confidence": "high" | "medium" | "low"
  }
]

Include coordinates for places only when you're confident in them (well-known cities/regions).
For gap insights, places may be empty. Use actual item IDs from the provided inventory.
Return an empty array [] if no meaningful geographic patterns are found.`;

function serializeItemsForClaude(items: InventoryItem[]): string {
  return items
    .map((item) => {
      const parts = [
        `[ID: ${item.id}] "${item.name}"`,
        item.story ? `  Story: ${item.story.slice(0, 250)}${item.story.length > 250 ? "…" : ""}` : null,
        item.provenance ? `  Provenance: ${item.provenance}` : null,
        item.originPlace?.name
          ? `  Origin: ${item.originPlace.name}${item.originPlace.lat ? ` (coords: ${item.originPlace.lat.toFixed(4)}, ${item.originPlace.lng!.toFixed(4)})` : " (no coords)"}`
          : null,
        item.macroLocation ? `  Current city: ${item.macroLocation}` : null,
        item.microLocation ? `  Stored at: ${item.microLocation}` : null,
        item.tags?.length ? `  Tags: ${item.tags.join(", ")}` : null,
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

    console.log("[API /agents/cartographer] analyzing", items.length, "items");

    const itemsWithGeo = items.filter((i) => i.originPlace?.name || i.macroLocation || i.story);
    if (itemsWithGeo.length < 2) {
      return NextResponse.json({
        insights: [],
        message: "Not enough geographic data yet — add more items with origin places to find patterns.",
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
          content: `Here is the complete inventory (${items.length} items, ${itemsWithGeo.length} with geographic data). ${showAll ? "Show me all geographic patterns — up to 5." : "Surface only the single most meaningful geographic pattern."}\n\n${serialized}`,
        },
      ],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "[]";
    console.log("[API /agents/cartographer] raw response:", rawText.slice(0, 600));

    const jsonMatch = rawText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn("[API /agents/cartographer] no JSON array found");
      return NextResponse.json({ insights: [], inventoryId });
    }

    const raw: Array<{
      type: CartographyType;
      insight: string;
      places: Array<{ name: string; lat?: number; lng?: number }>;
      affectedItems: string[];
      suggestedAction: string | null;
      confidence: PatternConfidence;
    }> = JSON.parse(jsonMatch[0]);

    const insights: CartographicInsight[] = raw.map((r, idx) => ({
      id: `${Date.now()}-${idx}`,
      type: r.type,
      insight: r.insight,
      places: (r.places ?? []).map((p) => ({
        name: p.name,
        ...(p.lat != null && p.lng != null ? { lat: p.lat, lng: p.lng } : {}),
      })),
      affectedItems: r.affectedItems ?? [],
      suggestedAction: r.suggestedAction ?? null,
      confidence: r.confidence ?? "medium",
      generatedAt: new Date(),
      dismissed: false,
    }));

    console.log("[API /agents/cartographer] found", insights.length, "patterns");
    return NextResponse.json({ insights, inventoryId });
  } catch (err) {
    console.error("[API /agents/cartographer] ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Analysis failed" },
      { status: 500 }
    );
  }
}

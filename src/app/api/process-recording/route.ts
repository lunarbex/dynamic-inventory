import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_ZONES } from "@/lib/types";

const client = new Anthropic();
const VALID_CATEGORIES = ACTIVITY_ZONES.map((z) => z.id);

async function geocode(placeName: string): Promise<{ lat: number; lng: number } | null> {
  if (!placeName?.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(placeName)}&format=json&limit=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "ObjectStories/1.0 (inventory app)" },
    });
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
    }
  } catch (err) {
    console.warn("[geocode] failed for:", placeName, err);
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const transcript: string = body.transcript ?? "";

    console.log("[API /process-recording] transcript length:", transcript.length);

    if (!transcript.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    console.log("[API /process-recording] calling Claude...");

    const extractResponse = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: `You help people document the objects in their lives — not as an inventory system, but as a record of stories, relationships, and meaning. You're a thoughtful listener who preserves the human voice in what people share.

TONE & LANGUAGE PRINCIPLES
- CRITICAL: Preserve first-person voice. The person speaking is the "I" in the story. If they said "I got this from my mom," the story field must say "I got this from my mom" — never "They got this from their mom" or "This was received from their mother." Keep I, me, my, we, our, ours exactly as spoken.
- Never use the word "owner." Objects "belong to" people, "live with" them, or are "cared for by" them.
- Preserve the warmth and specificity of how people actually speak. If someone says "my mom Sarah," write "Sarah" or "Sarah (mom)" — not "family member."
- The story field should read like the person actually said it — their cadence, their feelings, their specific details. Don't sanitize or bureaucratize.
- Preserve emotional language: "I love this thing," "it's a bit battered but perfect," "I'm never getting rid of it."
- Do not convert direct speech into reported speech. "I bought this in Tokyo" stays "I bought this in Tokyo," not "The speaker purchased this in Tokyo."

NAME & RELATIONSHIP EXTRACTION
- When someone mentions a person by name, keep that exact name. "My daughter Maya" → use "Maya" with the relationship context preserved.
- Recognize relationship phrases: "my partner," "our family," "my late father," "grandma Ruth," "my friend Kenji."
- For passTo: infer intent even without explicit language. "I hope Maya has this someday" or "this should stay in the family" or "my son would love this" all indicate pass-to intent.
- Capture the relationship warmth: "my partner Alex (who has better taste than me)" is better than "partner Alex."

STORY PRESERVATION
- story: Write this as the person's own narrative. Use their words. Keep the anecdotes. Keep the feelings. Keep the specific details like "the summer we drove from Portland to Baja" or "she made this by hand over three winters." Minimum 2-3 sentences if enough was said.
- provenance: Distill the origin and acquisition history. Name names. Keep places specific. "Bought at a flea market in Oaxaca with Sarah in 2019" is better than "acquired at a Mexican market."
- description: One vivid, specific sentence that conjures the actual object — not a generic category label.

SMART EXTRACTION RULES

Locations — extract FOUR separately from natural speech:
- microLocation: where it physically lives right now ("top shelf of the hall closet," "the kitchen junk drawer," "in a box labeled 'camping' in the garage")
- macroLocation: current city or region ("Portland, OR," "the Brooklyn apartment," "our place in Vermont")
- originPlace: descriptive text of where it came from or was acquired — preserve the story ("a street market in Marrakech," "my grandmother's house in rural Ohio," "Powell's Books in Portland")
- originPlaceGeo: clean, geocodable place name extracted from originPlace — city, region, or country only, suitable for a maps API ("Marrakech, Morocco," "Ohio, USA," "Portland, Oregon"). If no location is mentioned, use empty string.

Condition — infer from any descriptive language, not just the word "condition":
- "it's a bit battered" → "well-loved, showing wear"
- "still works perfectly" → "excellent, fully functional"
- "the handle's cracked but I can't throw it out" → "cracked handle, otherwise intact — kept for sentimental reasons"
- "basically new" → "like new"

Tags — suggest 3–6 specific, useful tags that will help find this item later. Think about:
- Material or origin ("handmade," "vintage," "inherited," "japanese," "ceramic")
- Emotional register ("sentimental," "everyday," "prized," "forgotten")
- Practical use ("camping," "cooking," "reading," "gifting")
- Story themes ("travel," "childhood," "collaboration," "repair")

Categories — available options (assign all that apply, using exact IDs):
${VALID_CATEGORIES.map((id) => {
  const zone = ACTIVITY_ZONES.find((z) => z.id === id);
  return `- "${id}": ${zone?.label}`;
}).join("\n")}

Respond ONLY with valid JSON matching this exact structure (no markdown, no explanation):
{
  "name": "specific, vivid name for the item",
  "description": "one evocative sentence describing the actual object",
  "categories": ["category_id1"],
  "microLocation": "exact spot in the home",
  "macroLocation": "current city or region",
  "originPlace": "descriptive text of where it came from — preserve the story",
  "originPlaceGeo": "clean geocodable place name for mapping (city/region/country), or empty string",
  "story": "the full story in the person's own voice — their words, feelings, and specific details",
  "provenance": "origin and acquisition history with names and places preserved",
  "passTo": "name and/or relationship of person who might receive this, or empty string",
  "isLoanable": false,
  "condition": "condition inferred from their description",
  "tags": ["tag1", "tag2", "tag3"]
}

If something isn't mentioned, use empty string for text fields, empty array for tags, false for isLoanable. For categories, make your best inference — only use ["other"] if truly uncategorizable.`,
      messages: [
        {
          role: "user",
          content: `Someone just described an object in their life. Here's what they said:\n\n"${transcript}"\n\nListen carefully to their voice, preserve their words, and extract the structured details.`,
        },
      ],
    });

    const rawText =
      extractResponse.content[0].type === "text" ? extractResponse.content[0].text : "{}";

    console.log("[API /process-recording] Claude raw response:", rawText.slice(0, 400));

    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Claude returned malformed response" }, { status: 500 });
    }

    const extracted = JSON.parse(jsonMatch[0]);

    const categories = Array.isArray(extracted.categories)
      ? extracted.categories.filter((c: string) =>
          (VALID_CATEGORIES as readonly string[]).includes(c)
        )
      : ["other"];

    // Geocode using the clean place name Claude extracted for mapping purposes.
    // Fall back to the descriptive originPlace string if no clean name was provided.
    const originPlaceName: string = extracted.originPlace ?? "";
    const geoQuery: string = (extracted.originPlaceGeo ?? "").trim() || originPlaceName;
    console.log("[API /process-recording] geocoding:", geoQuery, "(raw originPlace:", originPlaceName, ")");
    const coords = geoQuery ? await geocode(geoQuery) : null;

    const result = {
      extracted: {
        name: extracted.name ?? "",
        description: extracted.description ?? "",
        categories: categories.length > 0 ? categories : ["other"],
        microLocation: extracted.microLocation ?? "",
        macroLocation: extracted.macroLocation ?? "",
        originPlace: {
          name: originPlaceName,
          ...(coords ?? {}),
        },
        story: extracted.story ?? "",
        provenance: extracted.provenance ?? "",
        passTo: extracted.passTo ?? "",
        isLoanable: extracted.isLoanable === true,
        condition: extracted.condition ?? "",
        tags: Array.isArray(extracted.tags)
          ? extracted.tags.filter((t: unknown) => typeof t === "string").map((t: string) => t.toLowerCase().trim()).filter(Boolean)
          : [],
      },
    };

    console.log("[API /process-recording] result:", result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[API /process-recording] ERROR:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Processing failed" },
      { status: 500 }
    );
  }
}

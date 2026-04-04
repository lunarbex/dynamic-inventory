import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_ZONES } from "@/lib/types";

const client = new Anthropic();
const VALID_CATEGORIES = ACTIVITY_ZONES.map((z) => z.id);

const SYSTEM_PROMPT = `You are a visual item extractor for an inventory app. Analyze the photo and extract structured information about visible objects.

EXTRACTION RULES:
- Read any visible text, labels, brand names, SKUs, model numbers, batch numbers
- Identify the object category based on appearance
- Extract brand/manufacturer if a logo or name is visible
- Write a concise, specific description of what you see
- Suggest relevant tags based on object type, material, brand, use
- If multiple distinct items are visible, identify ALL of them

CATEGORIES (use exact IDs):
${VALID_CATEGORIES.join(", ")}

OUTPUT FORMAT — return ONLY valid JSON, no commentary:
{
  "items": [
    {
      "name": "Specific item name (read labels if present, otherwise describe)",
      "brand": "Brand/manufacturer name or null",
      "description": "One specific sentence describing the physical object",
      "categories": ["category_id"],
      "visibleText": "Any text visible on the object: labels, markings, numbers",
      "modelOrSku": "Model number, SKU, batch number if visible or null",
      "tags": ["tag1", "tag2", "tag3"],
      "confidence": "high" | "medium" | "low"
    }
  ],
  "multipleItemsDetected": true | false
}

If only one item, the array has one element. If multiple distinct objects are clearly visible, include all of them.
Confidence reflects how clearly identifiable the item is from the photo.`;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    if (!imageFile || imageFile.size === 0) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    // Convert file to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const mediaType = (imageFile.type || "image/jpeg") as "image/jpeg" | "image/png" | "image/webp" | "image/gif";

    console.log("[analyze-photo] Analyzing image — size:", imageFile.size, "type:", mediaType);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1500,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: "text",
              text: "Analyze this photo and extract all visible items with their details. Return JSON only.",
            },
          ],
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const result = JSON.parse(jsonMatch[0]);

    // Validate and sanitize categories
    const items = (result.items ?? []).map((item: Record<string, unknown>) => ({
      ...item,
      categories: ((item.categories as string[]) ?? []).filter((c) => VALID_CATEGORIES.includes(c as never)),
      tags: (item.tags as string[]) ?? [],
    }));

    return NextResponse.json({ items, multipleItemsDetected: result.multipleItemsDetected ?? items.length > 1 });
  } catch (err) {
    console.error("[analyze-photo] Error:", err);
    return NextResponse.json({ error: "Photo analysis failed" }, { status: 500 });
  }
}

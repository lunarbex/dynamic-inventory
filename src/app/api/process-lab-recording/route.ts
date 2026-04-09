import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { ACTIVITY_ZONES } from "@/lib/types";

const client = new Anthropic();
const VALID_CATEGORIES = ACTIVITY_ZONES.map((z) => z.id);

const SYSTEM_PROMPT = `You are the Lab Assistant for InvenStories, processing voice descriptions of materials, experiments, prototypes, and tests into structured lab documentation.

EXTRACTION RULES:
- Extract the item name, description, brand, batch/lot number if mentioned
- Identify storage location and origin place if mentioned
- Parse technical specifications into key-value pairs
- Identify test conditions (temperature, method, duration, tools, quantities/ratios)
- Capture objective observations of what happened
- Determine success/failure and the metric used
- Note analysis (why this result occurred)
- List concrete next steps or follow-up questions
- Suggest relevant tags

CATEGORIES (use exact IDs):
${VALID_CATEGORIES.join(", ")}

OUTPUT FORMAT — return ONLY valid JSON, no commentary:
{
  "name": "Item or material name",
  "description": "One-sentence description of what this is",
  "brand": "Brand/manufacturer or null",
  "batchLot": "Batch or lot number or null",
  "source": "Supplier/source or null",
  "categories": ["category_id"],
  "microLocation": "Storage spot if mentioned, else empty string",
  "macroLocation": "City/region if mentioned, else empty string",
  "originPlace": { "name": "Where acquired if mentioned, else empty string" },
  "tags": ["tag1", "tag2"],
  "labData": {
    "specifications": {
      "key": "value — only fields with actual data, omit empty"
    },
    "testConditions": {
      "key": "value — temperature, method, duration, tools, etc."
    },
    "observations": "Objective description of what happened during use/testing",
    "results": {
      "success": true or false or null,
      "metric": "How success/failure was measured",
      "vsExpected": "How it compared to expectations or null",
      "vsPrevious": "How it compared to previous test or null"
    },
    "analysis": "Why this result occurred, or null if not inferable",
    "nextSteps": ["concrete next step 1", "concrete next step 2"]
  }
}`;

export async function POST(req: NextRequest) {
  try {
    const { transcript } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "No transcript provided" }, { status: 400 });
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `Extract structured lab documentation from this description:\n\n${transcript}\n\nReturn JSON only.`,
        },
      ],
    });

    const text = response.content[0].type === "text" ? response.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const extracted = JSON.parse(jsonMatch[0]);

    // Validate categories
    extracted.categories = (extracted.categories ?? []).filter(
      (c: string) => VALID_CATEGORIES.includes(c as never)
    );

    // Ensure labData shape is complete
    extracted.labData = {
      brand: extracted.brand ?? undefined,
      batchLot: extracted.batchLot ?? undefined,
      source: extracted.source ?? undefined,
      specifications: extracted.labData?.specifications ?? {},
      testConditions: extracted.labData?.testConditions ?? {},
      observations: extracted.labData?.observations ?? "",
      results: extracted.labData?.results ?? {},
      analysis: extracted.labData?.analysis ?? undefined,
      nextSteps: extracted.labData?.nextSteps ?? [],
    };

    return NextResponse.json({ extracted });
  } catch (err) {
    console.error("[process-lab-recording] Error:", err);
    return NextResponse.json({ error: "Lab processing failed" }, { status: 500 });
  }
}

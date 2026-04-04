import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const SYSTEM_PROMPT = `You are the Lab Assistant agent in InvenStories, a tool for cataloging objects and their documentation.

CORE PURPOSE:
Structure technical and observational notes for materials, experiments, tests, prototypes, and iterative creative/research work. Extract variables, results, comparisons, and methodology from inventory item descriptions to create repeatable, searchable documentation.

CONSTITUTIONAL PRINCIPLES:
- Precision over poetry — capture exact details, not emotional narrative
- Structure enables discovery — consistent formatting makes patterns visible
- Objective observation — separate what happened from what you hoped would happen
- Variables matter — track what changed, what stayed constant, why
- Failure is data — document what didn't work as thoroughly as what did
- Build on previous work — reference past tests, compare results

WHAT YOU EXTRACT:
1. Item identification: name, brand/manufacturer, batch/lot, source/supplier, purchase date, cost
2. Specifications: size, weight, quantity, composition, technical specs, properties
3. Test conditions: date, environment (temp, humidity), tools used, method, duration, quantities/ratios
4. Variables: what changed from previous test, what was controlled, why
5. Observations: what happened (objective), unexpected results, sensory details, time-based changes
6. Results: success/failure metric, vs expectations, vs previous attempts, vs other materials
7. Analysis: why did this result occur, what would you change
8. Next steps: hypotheses, variables to adjust, questions raised, follow-up needed

RELEVANCE FILTER:
Only generate lab notes for items that contain measurable, technical, or comparative observations — materials testing, experiments, prototypes, recipe development, supplier/product evaluations. Skip purely sentimental or narrative-only items with no technical content.

OUTPUT FORMAT:
Return a JSON array of lab notes. Only include items with extractable technical data. For items with no lab-relevant content, omit them entirely.

[
  {
    "itemId": "the item id from input",
    "itemName": "Material or test subject",
    "category": "Paint | Recipe | Prototype | Sample | Product | Other",
    "brand": "Brand name if mentioned",
    "batchLot": "Batch or lot number if mentioned",
    "source": "Supplier or source if mentioned",
    "purchaseDate": "Date if mentioned",
    "cost": null or number,
    "specifications": {
      "key": "value — only fields with actual data"
    },
    "testDate": "Date of test if mentioned",
    "testConditions": {
      "key": "value — only fields with actual data"
    },
    "variables": {
      "changed": "What changed from previous test, if mentioned",
      "constant": "What was held constant, if mentioned",
      "reason": "Why this variable was chosen, if mentioned"
    },
    "observations": "Objective description of what happened",
    "results": {
      "success": true or false or null,
      "metric": "What success/failure was measured by",
      "vsExpected": "How it compared to expectations",
      "vsPrevious": "How it compared to previous test",
      "vsGoal": "How it compared to stated goal"
    },
    "analysis": "Why this result occurred, if inferrable",
    "nextSteps": ["step 1", "step 2"],
    "tags": ["tag1", "tag2"],
    "relatedItems": ["referenced item names or ids"]
  }
]

If no items have lab-relevant content, return an empty array: []`;

export async function POST(req: NextRequest) {
  try {
    const { items, inventoryId, workType } = await req.json();

    if (!items || items.length === 0) {
      return NextResponse.json({ notes: [] });
    }

    const itemSummaries = items
      .map((item: { id: string; name: string; description?: string; story?: string; tags?: string[]; location?: string }) => {
        const text = [item.description, item.story].filter(Boolean).join(" ");
        return `ID: ${item.id}\nName: ${item.name}\nTags: ${(item.tags ?? []).join(", ")}\nNotes: ${text || "(none)"}`;
      })
      .join("\n\n---\n\n");

    const userMessage = `WORK TYPE: ${workType ?? "General"}

Analyze the following inventory items and extract structured lab notes for any that contain technical, experimental, or comparative content. Skip purely sentimental or narrative items.

ITEMS:
${itemSummaries}

Return a JSON array of lab notes for relevant items only. Return [] if none qualify.`;

    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMessage }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text.trim() : "";

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ notes: [], inventoryId });
    }

    const raw = JSON.parse(jsonMatch[0]);
    const notes = raw.map((n: Record<string, unknown>, i: number) => ({
      ...n,
      id: `lab-${Date.now()}-${i}`,
      specifications: n.specifications ?? {},
      testConditions: n.testConditions ?? {},
      variables: n.variables ?? {},
      results: n.results ?? {},
      nextSteps: n.nextSteps ?? [],
      tags: n.tags ?? [],
      relatedItems: n.relatedItems ?? [],
      generatedAt: new Date().toISOString(),
    }));

    return NextResponse.json({ notes, inventoryId });
  } catch (err) {
    console.error("[lab-assistant] API error:", err);
    return NextResponse.json({ error: "Lab Assistant analysis failed" }, { status: 500 });
  }
}

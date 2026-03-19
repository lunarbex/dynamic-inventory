import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";

const client = new Anthropic();

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    console.log("[transcribe-audio] audio size:", audioFile.size, "type:", audioFile.type);

    const arrayBuffer = await audioFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    // Determine MIME type — mobile often records audio/mp4, desktop audio/webm
    const mimeType = (audioFile.type || "audio/webm") as
      | "audio/mp4"
      | "audio/mpeg"
      | "audio/webm"
      | "audio/wav"
      | "audio/ogg";

    // Claude claude-sonnet-4-6 accepts audio via the document content block
    // Firestore rule note: no rule change needed — this is a server-only call
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: [{ role: "user", content: [
        {
          type: "document",
          source: { type: "base64", media_type: mimeType, data: base64 },
        } as any, // audio via document block (Claude claude-sonnet-4-6+)
        {
          type: "text",
          text: "Please transcribe this voice recording verbatim. Return only the spoken words — no commentary, no formatting, no labels. If the audio is inaudible or empty, return an empty string.",
        },
      ] }],
    });

    const transcript =
      response.content[0]?.type === "text" ? response.content[0].text.trim() : "";

    console.log("[transcribe-audio] transcript length:", transcript.length);
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[transcribe-audio] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile || audioFile.size === 0) {
      return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey === "your-openai-api-key-here") {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    console.log("[transcribe-audio] Whisper — size:", audioFile.size, "type:", audioFile.type);

    // Map MIME type to a supported Whisper file extension.
    // Whisper accepts: flac, m4a, mp3, mp4, mpeg, mpga, oga, ogg, wav, webm
    const ext =
      audioFile.type.includes("mp4") || audioFile.type.includes("m4a") ? "m4a"
      : audioFile.type.includes("ogg") ? "ogg"
      : audioFile.type.includes("wav") ? "wav"
      : audioFile.type.includes("mpeg") ? "mp3"
      : "webm";

    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, `recording.${ext}`);
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "en");
    // Prompt primes Whisper for the vocabulary it will encounter
    whisperForm.append(
      "prompt",
      "Household items, family heirlooms, furniture, antiques, collectibles, personal belongings. Names of people, places, and objects."
    );

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: whisperForm,
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error("[transcribe-audio] Whisper error:", response.status, errBody);
      throw new Error(`Whisper API returned ${response.status}`);
    }

    const data = await response.json();
    const transcript = (data.text ?? "").trim();

    console.log("[transcribe-audio] Whisper transcript length:", transcript.length);
    return NextResponse.json({ transcript });
  } catch (err) {
    console.error("[transcribe-audio] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 }
    );
  }
}

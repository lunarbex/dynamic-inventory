"use client";

import { useState, useRef, useCallback } from "react";

export type RecordingState = "idle" | "recording" | "stopped";

interface ISpeechRecognitionEvent {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: { isFinal: boolean; 0: { transcript: string } };
  };
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  start(): void;
  stop(): void;
}

declare global {
  interface Window {
    SpeechRecognition?: new () => ISpeechRecognition;
    webkitSpeechRecognition?: new () => ISpeechRecognition;
  }
}

function getBestMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/mp4",
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return ""; // let browser choose its default — always playable
}

export function useVoiceRecorder(
  onTranscriptUpdate?: (transcript: string) => void
) {
  const [state, setState] = useState<RecordingState>("idle");
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const finalTranscriptRef = useRef("");
  const onTranscriptUpdateRef = useRef(onTranscriptUpdate);
  onTranscriptUpdateRef.current = onTranscriptUpdate;

  const start = useCallback(async () => {
    setError(null);
    finalTranscriptRef.current = "";

    const SpeechRecognition =
      window.SpeechRecognition ?? window.webkitSpeechRecognition;
    const hasSpeechRecognition = !!SpeechRecognition;
    setSpeechSupported(hasSpeechRecognition);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = getBestMimeType();

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        // Use the mimeType the recorder actually used, not what we requested
        const actualMime = recorder.mimeType || mimeType;
        const blob = new Blob(chunksRef.current, { type: actualMime });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
        stream.getTracks().forEach((t) => t.stop());
      };

      recorder.start(250);
      setState("recording");
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);

      if (hasSpeechRecognition && SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";
        recognitionRef.current = recognition;

        recognition.onresult = (event) => {
          let interim = "";
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
              finalTranscriptRef.current += result[0].transcript + " ";
            } else {
              interim += result[0].transcript;
            }
          }
          const full = (finalTranscriptRef.current + interim).trim();
          onTranscriptUpdateRef.current?.(full);
        };

        recognition.onerror = () => {
          // Silently fail — user can type manually
        };

        recognition.start();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone access denied");
    }
  }, []);

  const stop = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setState("stopped");
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    // Push whatever final transcript we have
    const final = finalTranscriptRef.current.trim();
    if (final) onTranscriptUpdateRef.current?.(final);
  }, []);

  const reset = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
    setDuration(0);
    setState("idle");
    setError(null);
    finalTranscriptRef.current = "";
    onTranscriptUpdateRef.current?.("");
  }, [audioUrl]);

  return { state, audioBlob, audioUrl, duration, speechSupported, error, start, stop, reset };
}

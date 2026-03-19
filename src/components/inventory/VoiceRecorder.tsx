"use client";

import { useVoiceRecorder } from "@/hooks/useVoiceRecorder";
import { Mic, Square, RotateCcw, Play, Pause } from "lucide-react";
import { useRef, useState } from "react";

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string) => void;
  onAudioReady?: (blob: Blob) => void;
  onStop: () => void;
  onReset: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceRecorder({ onTranscriptChange, onAudioReady, onStop, onReset }: VoiceRecorderProps) {
  const { state, audioUrl, duration, speechSupported, error, start, stop, reset } =
    useVoiceRecorder(onTranscriptChange, onAudioReady);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function handleStop() {
    stop();
    onStop();
  }

  function handleReset() {
    reset();
    setIsPlaying(false);
    onReset();
  }

  function togglePlay() {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        // If playback fails (codec issue), silently ignore
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {error && (
        <p className="text-red-500 text-sm text-center bg-red-50 px-4 py-2 rounded-lg w-full">
          {error}
        </p>
      )}

      {/* Recording button */}
      <div
        className={`w-24 h-24 rounded-full flex items-center justify-center transition-all ${
          state === "recording"
            ? "bg-red-500 shadow-[0_0_0_8px_rgba(239,68,68,0.2)] animate-pulse"
            : state === "stopped"
            ? "bg-emerald-500"
            : "bg-stone-200"
        }`}
      >
        {state === "idle" && (
          <button
            onClick={start}
            className="flex items-center justify-center w-full h-full rounded-full hover:bg-stone-300 transition-colors"
            aria-label="Start recording"
          >
            <Mic className="w-8 h-8 text-stone-600" />
          </button>
        )}
        {state === "recording" && (
          <button
            onClick={handleStop}
            className="flex items-center justify-center w-full h-full rounded-full"
            aria-label="Stop recording"
          >
            <Square className="w-8 h-8 text-white fill-white" />
          </button>
        )}
        {state === "stopped" && (
          <div className="flex items-center justify-center w-full h-full">
            <Mic className="w-8 h-8 text-white" />
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="text-center">
        {state === "idle" && (
          <p className="text-stone-500 text-sm">Tap to start recording</p>
        )}
        {state === "recording" && (
          <div>
            <p className="text-red-500 font-medium">Recording... tap to stop</p>
            <p className="text-stone-400 text-sm mt-1">{formatDuration(duration)}</p>
          </div>
        )}
        {state === "stopped" && (
          <p className="text-emerald-600 font-medium text-sm">
            Recording complete ({formatDuration(duration)})
          </p>
        )}
      </div>

      {/* Speech recognition notice while recording */}
      {state === "recording" && speechSupported === false && (
        <p className="text-xs text-stone-400 text-center">
          Live transcription not available — type your description below after stopping
        </p>
      )}

      {/* Playback + re-record controls after stopping */}
      {state === "stopped" && (
        <div className="flex items-center gap-2">
          {audioUrl && (
            <button
              onClick={togglePlay}
              className="flex items-center gap-2 px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-sm transition-colors"
            >
              {isPlaying ? (
                <><Pause className="w-3.5 h-3.5" /> Pause</>
              ) : (
                <><Play className="w-3.5 h-3.5" /> Listen back</>
              )}
            </button>
          )}
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-3 py-1.5 text-stone-500 hover:text-stone-700 hover:bg-stone-100 rounded-lg text-sm transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Re-record
          </button>
        </div>
      )}

      {audioUrl && (
        <audio
          ref={audioRef}
          src={audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />
      )}
    </div>
  );
}

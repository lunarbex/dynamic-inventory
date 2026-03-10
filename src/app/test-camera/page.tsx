"use client";

/**
 * Minimal camera test page — visits /test-camera in browser.
 * If this works, getUserMedia is fine and the issue is in PhotoCapture integration.
 * If this fails, the issue is permissions/HTTPS/browser support.
 */

import { useRef, useState } from "react";

export default function TestCameraPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [log, setLog] = useState<string[]>([]);
  const [streaming, setStreaming] = useState(false);

  function addLog(msg: string) {
    console.log("[TestCamera]", msg);
    setLog((prev) => [...prev, `${new Date().toISOString().slice(11, 23)} — ${msg}`]);
  }

  async function startCamera() {
    setLog([]);
    addLog("Button clicked");
    addLog(`navigator.mediaDevices exists: ${!!navigator.mediaDevices}`);
    addLog(`getUserMedia exists: ${!!navigator.mediaDevices?.getUserMedia}`);
    addLog(`Is secure context: ${window.isSecureContext}`);
    addLog(`Protocol: ${window.location.protocol}`);

    if (!navigator.mediaDevices?.getUserMedia) {
      addLog("ERROR: getUserMedia not available — need HTTPS or localhost");
      return;
    }

    try {
      addLog("Calling getUserMedia({ video: true })...");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      addLog(`Stream received — tracks: ${stream.getVideoTracks().length}`);
      addLog(`Track label: ${stream.getVideoTracks()[0]?.label ?? "unknown"}`);
      addLog(`Track state: ${stream.getVideoTracks()[0]?.readyState}`);

      const video = videoRef.current;
      addLog(`videoRef.current exists: ${!!video}`);

      if (video) {
        video.srcObject = stream;
        addLog("srcObject set on video element");
        video.onloadedmetadata = () => {
          addLog(`Video metadata loaded — ${video.videoWidth}×${video.videoHeight}`);
        };
        video.onplay = () => addLog("Video playing!");
        video.onerror = (e) => addLog(`Video error: ${JSON.stringify(e)}`);
        await video.play();
        addLog("video.play() resolved");
        setStreaming(true);
      } else {
        addLog("ERROR: videoRef.current is null — element not in DOM");
      }
    } catch (err: unknown) {
      const e = err as Error;
      addLog(`ERROR: ${e.name} — ${e.message}`);
    }
  }

  function stopCamera() {
    const video = videoRef.current;
    if (video?.srcObject) {
      (video.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
    setStreaming(false);
    addLog("Stream stopped");
  }

  return (
    <div className="min-h-screen bg-black text-white p-6">
      <h1 className="text-xl font-bold mb-4">Camera Test Page</h1>

      {/* Video always in DOM so ref is available */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full max-w-md bg-stone-800 rounded-xl mb-4"
        style={{ display: streaming ? "block" : "none" }}
      />

      {!streaming && (
        <div className="w-full max-w-md h-48 bg-stone-800 rounded-xl mb-4 flex items-center justify-center text-stone-500">
          No stream yet
        </div>
      )}

      <div className="flex gap-3 mb-6">
        <button
          onClick={startCamera}
          className="px-4 py-2 bg-amber-500 hover:bg-amber-600 rounded-lg font-semibold text-sm"
        >
          Start Camera
        </button>
        {streaming && (
          <button
            onClick={stopCamera}
            className="px-4 py-2 bg-stone-700 hover:bg-stone-600 rounded-lg font-semibold text-sm"
          >
            Stop
          </button>
        )}
      </div>

      <div className="bg-stone-900 rounded-xl p-4 max-w-2xl font-mono text-xs space-y-1">
        {log.length === 0 && <p className="text-stone-500">Click Start Camera to begin logging</p>}
        {log.map((line, i) => (
          <p key={i} className={line.includes("ERROR") ? "text-red-400" : "text-green-400"}>{line}</p>
        ))}
      </div>
    </div>
  );
}

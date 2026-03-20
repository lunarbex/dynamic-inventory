"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Camera, ImagePlus, X, RotateCcw, Check, SwitchCamera } from "lucide-react";
import Image from "next/image";

interface PhotoCaptureProps {
  photos: File[];
  previewUrls: string[];
  onAddPhotos: (files: File[]) => void;
  onRemove: (index: number) => void;
}

type CameraState = "closed" | "requesting" | "viewfinder" | "preview";

function log(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[PhotoCapture] ${msg}`, data);
  } else {
    console.log(`[PhotoCapture] ${msg}`);
  }
}

export function PhotoCapture({ photos, previewUrls, onAddPhotos, onRemove }: PhotoCaptureProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const fallbackCameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Store the live stream here so we can attach it after the video element mounts
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("closed");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // ── Stream management ──────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      log("Stopping stream tracks");
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    // Detach from video element too
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // KEY FIX: Attach stream to video element after it mounts.
  // The video element only exists in the DOM when cameraState === "viewfinder".
  // startStream stores the stream in streamRef, then sets state to "viewfinder".
  // This effect runs after that render, at which point videoRef.current is valid.
  useEffect(() => {
    if (cameraState === "viewfinder" && videoRef.current && streamRef.current && !cameraError) {
      log("Attaching stream to video element", {
        hasVideo: !!videoRef.current,
        hasStream: !!streamRef.current,
        tracks: streamRef.current.getVideoTracks().length,
      });
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState, cameraError]);

  const startStream = useCallback(async (facing: "environment" | "user") => {
    stopStream();
    setCameraError(null);

    log("Requesting camera", { facing, isSecureContext: window.isSecureContext });

    try {
      const constraints = {
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      };
      log("getUserMedia constraints", constraints);

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      const tracks = stream.getVideoTracks();
      log("Stream received", {
        trackCount: tracks.length,
        label: tracks[0]?.label,
        state: tracks[0]?.readyState,
        settings: tracks[0]?.getSettings?.(),
      });

      // Store stream in ref — DON'T try to set srcObject here.
      // The video element is not in the DOM yet (still showing "requesting" state).
      // The useEffect above will attach it after setCameraState("viewfinder") triggers a render.
      streamRef.current = stream;

      log("Setting cameraState → viewfinder (video element will mount, then effect attaches stream)");
      setCameraState("viewfinder");

      // Detect multiple cameras
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");
      log("Video input devices found", videoDevices.length);
      setHasMultipleCameras(videoDevices.length > 1);
    } catch (err: unknown) {
      const e = err as Error;
      log("getUserMedia error", { name: e.name, message: e.message });

      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") {
        setCameraError("permission");
      } else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") {
        setCameraError("no-camera");
      } else if (e.name === "NotReadableError" || e.name === "TrackStartError") {
        setCameraError("in-use");
      } else {
        setCameraError("unavailable");
      }
      setCameraState("viewfinder"); // show error UI in modal
    }
  }, [stopStream]);

  // ── Open / close ───────────────────────────────────────────────────────────

  function openCamera() {
    log("openCamera called", {
      hasMediaDevices: !!navigator.mediaDevices,
      hasGetUserMedia: !!navigator.mediaDevices?.getUserMedia,
      isSecureContext: window.isSecureContext,
      protocol: window.location.protocol,
    });

    setCapturedUrl(null);
    setCapturedBlob(null);
    setCameraError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      log("getUserMedia not available — showing no-api error");
      setCameraError("no-api");
      setCameraState("viewfinder");
      return;
    }

    log("Setting cameraState → requesting");
    setCameraState("requesting");
  }

  function closeCamera() {
    log("closeCamera");
    stopStream();
    if (capturedUrl) {
      URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(null);
    }
    setCapturedBlob(null);
    setCameraState("closed");
    setCameraError(null);
  }

  // Start stream when entering "requesting" state
  useEffect(() => {
    if (cameraState === "requesting") {
      log("cameraState is requesting — calling startStream");
      startStream(facingMode);
    }
    return () => {
      // Only stop stream on full close, not on state transitions
      if (cameraState === "closed") {
        stopStream();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraState]); // intentionally omit startStream/facingMode/stopStream to avoid restart loops

  // Restart stream when user flips camera (only while viewfinder is active)
  const prevFacingRef = useRef(facingMode);
  useEffect(() => {
    if (cameraState === "viewfinder" && !cameraError && prevFacingRef.current !== facingMode) {
      log("Facing mode changed — restarting stream", facingMode);
      prevFacingRef.current = facingMode;
      startStream(facingMode);
    }
  }, [facingMode, cameraState, cameraError, startStream]);

  // Stop stream when component unmounts
  useEffect(() => {
    return () => { stopStream(); };
  }, [stopStream]);

  // ── Capture ────────────────────────────────────────────────────────────────

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) {
      log("capturePhoto: missing video or canvas ref");
      return;
    }

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    log("Capturing frame", { width: w, height: h });

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob(
      (blob) => {
        if (!blob) { log("toBlob returned null"); return; }
        log("Blob created", { size: blob.size, type: blob.type });
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
        const url = URL.createObjectURL(blob);
        setCapturedUrl(url);
        setCapturedBlob(blob);
        setCameraState("preview");
        stopStream();
      },
      "image/jpeg",
      0.92
    );
  }

  // ── Keep / retake ──────────────────────────────────────────────────────────

  function keepPhoto() {
    if (!capturedBlob) return;
    const file = new File([capturedBlob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
    onAddPhotos([file]);
    log("Photo kept, returning to viewfinder");
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    // Restart stream for another shot
    streamRef.current = null;
    setCameraState("requesting");
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    streamRef.current = null;
    setCameraState("requesting");
  }

  function done() {
    if (capturedBlob) {
      const file = new File([capturedBlob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" });
      onAddPhotos([file]);
    }
    closeCamera();
  }

  // ── Flip camera ────────────────────────────────────────────────────────────

  function flipCamera() {
    const next = facingMode === "environment" ? "user" : "environment";
    log("Flipping camera to", next);
    setFacingMode(next);
  }

  // ── Gallery picker ─────────────────────────────────────────────────────────

  function handleGalleryFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (valid.length > 0) onAddPhotos(valid);
  }

  function handlePermissionFallback() {
    closeCamera();
    fallbackCameraRef.current?.click();
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-3">
        {/* Photo grid */}
        {previewUrls.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-xl overflow-hidden bg-stone-100">
                <Image src={url} alt={`Photo ${i + 1}`} fill className="object-cover" />
                <button
                  onClick={() => onRemove(i)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center transition-colors"
                  aria-label="Remove photo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={openCamera}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 text-stone-500 hover:text-amber-600 rounded-xl transition-colors text-sm font-medium"
          >
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 text-stone-500 hover:text-amber-600 rounded-xl transition-colors text-sm font-medium"
          >
            <ImagePlus className="w-4 h-4" />
            Gallery
          </button>
        </div>

        {photos.length === 0 && (
          <p className="text-center text-xs text-stone-400">
            Add photos of the object (optional but helpful)
          </p>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleGalleryFiles(e.target.files)} />
      <input ref={fallbackCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleGalleryFiles(e.target.files)} />

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Camera modal ──────────────────────────────────────────────────── */}
      {cameraState !== "closed" && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col"
          style={{ height: "100dvh" }}
        >

          {/* Close */}
          <button
            onClick={closeCamera}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
            aria-label="Close camera"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Photos kept badge */}
          {photos.length > 0 && (
            <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-white text-sm font-semibold rounded-full">
              {photos.length} kept
            </div>
          )}

          {/* ── Requesting / spinner ── */}
          {cameraState === "requesting" && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
              <div className="w-10 h-10 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-white text-lg font-medium">Waiting for camera access…</p>
              <p className="text-stone-400 text-sm">Allow camera access when your browser asks</p>
            </div>
          )}

          {/* ── Viewfinder / error ── */}
          {cameraState === "viewfinder" && (
            <>
              {cameraError ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
                  <Camera className="w-12 h-12 text-stone-500" />

                  {cameraError === "permission" && (
                    <>
                      <p className="text-white text-lg font-medium">Camera access denied</p>
                      <p className="text-stone-400 text-sm max-w-xs">
                        Click the camera/lock icon in your browser address bar and allow camera access, then try again.
                      </p>
                      <button onClick={handlePermissionFallback}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
                        Open file picker instead
                      </button>
                    </>
                  )}
                  {cameraError === "no-camera" && (
                    <>
                      <p className="text-white text-lg font-medium">No camera found</p>
                      <p className="text-stone-400 text-sm">No camera device was detected on this computer.</p>
                      <button onClick={closeCamera}
                        className="px-5 py-2.5 bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded-xl">
                        Close
                      </button>
                    </>
                  )}
                  {cameraError === "in-use" && (
                    <>
                      <p className="text-white text-lg font-medium">Camera in use</p>
                      <p className="text-stone-400 text-sm max-w-xs">
                        Another app is using the camera. Close it and try again.
                      </p>
                      <button onClick={() => startStream(facingMode)}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
                        Try again
                      </button>
                    </>
                  )}
                  {cameraError === "unavailable" && (
                    <>
                      <p className="text-white text-lg font-medium">Camera unavailable</p>
                      <p className="text-stone-400 text-sm">The camera could not be started. Check browser console for details.</p>
                      <button onClick={handlePermissionFallback}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
                        Open file picker instead
                      </button>
                    </>
                  )}
                  {cameraError === "no-api" && (
                    <>
                      <p className="text-white text-lg font-medium">Camera requires HTTPS</p>
                      <p className="text-stone-400 text-sm max-w-xs">
                        Browser camera only works on <strong className="text-stone-300">localhost</strong> or
                        an <strong className="text-stone-300">https://</strong> connection.
                        On mobile, use <strong className="text-stone-300">ngrok</strong> to get an HTTPS tunnel to localhost.
                      </p>
                      <button onClick={handlePermissionFallback}
                        className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">
                        Open file picker instead
                      </button>
                      <button onClick={closeCamera}
                        className="text-stone-500 hover:text-stone-300 text-sm">
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  {/* Live video — always rendered when in viewfinder so ref is stable */}
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="flex-1 w-full object-cover min-h-0"
                    style={facingMode === "user" ? { transform: "scaleX(-1)" } : undefined}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      log("Video metadata loaded", { width: v.videoWidth, height: v.videoHeight });
                    }}
                    onPlay={() => log("Video playing")}
                    onError={(e) => log("Video element error", e)}
                  />

                  {/* Controls bar — pb accounts for iPhone home indicator safe area */}
                  <div className="flex items-center justify-center gap-8 pt-6 pb-6 bg-black"
                    style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
                  >
                    {/* Flip */}
                    <button
                      onClick={flipCamera}
                      disabled={!hasMultipleCameras}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        hasMultipleCameras
                          ? "bg-stone-700 hover:bg-stone-600 text-white"
                          : "bg-stone-800 text-stone-600 cursor-default"
                      }`}
                      aria-label="Flip camera"
                    >
                      <SwitchCamera className="w-5 h-5" />
                    </button>

                    {/* Shutter */}
                    <button
                      onClick={capturePhoto}
                      className="w-20 h-20 rounded-full bg-white hover:bg-stone-100 active:scale-95 transition-all shadow-lg flex items-center justify-center"
                      aria-label="Take photo"
                    >
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-stone-300" />
                    </button>

                    {/* Done */}
                    <button
                      onClick={closeCamera}
                      disabled={photos.length === 0}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                        photos.length > 0
                          ? "bg-amber-500 hover:bg-amber-600 text-white"
                          : "bg-stone-800 text-stone-600 cursor-default"
                      }`}
                      aria-label="Done"
                    >
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Preview ── */}
          {cameraState === "preview" && capturedUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedUrl} alt="Captured" className="flex-1 min-h-0 w-full object-contain" />
              <div className="flex items-center justify-center gap-4 pt-6 bg-black"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
              >
                <button onClick={retake}
                  className="flex items-center gap-2 px-5 py-3 bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded-2xl">
                  <RotateCcw className="w-4 h-4" /> Retake
                </button>
                <button onClick={keepPhoto}
                  className="flex items-center gap-2 px-5 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl">
                  <Camera className="w-4 h-4" /> Keep & shoot more
                </button>
                <button onClick={done}
                  className="flex items-center gap-2 px-5 py-3 bg-white hover:bg-stone-100 text-stone-900 font-semibold rounded-2xl">
                  <Check className="w-4 h-4" /> Done
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}

"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { Camera, ImagePlus, X, RotateCcw, Check, SwitchCamera, Crop } from "lucide-react";
import Image from "next/image";

interface PhotoCaptureProps {
  photos: File[];
  previewUrls: string[];
  onAddPhotos: (files: File[]) => void;
  onRemove: (index: number) => void;
}

type CameraState = "closed" | "requesting" | "viewfinder" | "cropping" | "preview";

type AspectOption = { label: string; value: number | null };
const ASPECT_OPTIONS: AspectOption[] = [
  { label: "Free",   value: null },
  { label: "Square", value: 1 },
  { label: "4 : 3",  value: 4 / 3 },
  { label: "3 : 4",  value: 3 / 4 },
];

function log(msg: string, data?: unknown) {
  if (data !== undefined) {
    console.log(`[PhotoCapture] ${msg}`, data);
  } else {
    console.log(`[PhotoCapture] ${msg}`);
  }
}

/** Apply a pixel-area crop to an image URL and return a JPEG blob. */
async function getCroppedBlob(imageSrc: string, cropPixels: Area): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = cropPixels.width;
      canvas.height = cropPixels.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) { reject(new Error("No canvas context")); return; }
      ctx.drawImage(img, cropPixels.x, cropPixels.y, cropPixels.width, cropPixels.height, 0, 0, cropPixels.width, cropPixels.height);
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error("toBlob returned null"));
      }, "image/jpeg", 0.92);
    };
    img.onerror = reject;
    img.src = imageSrc;
  });
}

export function PhotoCapture({ photos, previewUrls, onAddPhotos, onRemove }: PhotoCaptureProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const fallbackCameraRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [cameraState, setCameraState] = useState<CameraState>("closed");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);

  // Crop state
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspectIndex, setAspectIndex] = useState(1); // default: Square
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null); // raw uncropped URL for the cropper
  const [cropping, setCropping] = useState(false);

  // ── Stream management ──────────────────────────────────────────────────────

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      log("Stopping stream tracks");
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    if (cameraState === "viewfinder" && videoRef.current && streamRef.current && !cameraError) {
      log("Attaching stream to video element");
      videoRef.current.srcObject = streamRef.current;
    }
  }, [cameraState, cameraError]);

  const startStream = useCallback(async (facing: "environment" | "user") => {
    stopStream();
    setCameraError(null);
    log("Requesting camera", { facing, isSecureContext: window.isSecureContext });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      streamRef.current = stream;
      log("Setting cameraState → viewfinder");
      setCameraState("viewfinder");
      const devices = await navigator.mediaDevices.enumerateDevices();
      setHasMultipleCameras(devices.filter((d) => d.kind === "videoinput").length > 1);
    } catch (err: unknown) {
      const e = err as Error;
      log("getUserMedia error", { name: e.name, message: e.message });
      if (e.name === "NotAllowedError" || e.name === "PermissionDeniedError") setCameraError("permission");
      else if (e.name === "NotFoundError" || e.name === "DevicesNotFoundError") setCameraError("no-camera");
      else if (e.name === "NotReadableError" || e.name === "TrackStartError") setCameraError("in-use");
      else setCameraError("unavailable");
      setCameraState("viewfinder");
    }
  }, [stopStream]);

  // ── Open / close ───────────────────────────────────────────────────────────

  function openCamera() {
    setCapturedUrl(null);
    setCapturedBlob(null);
    setCameraError(null);
    setCropSrc(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError("no-api");
      setCameraState("viewfinder");
      return;
    }
    setCameraState("requesting");
  }

  function closeCamera() {
    stopStream();
    if (capturedUrl) { URL.revokeObjectURL(capturedUrl); setCapturedUrl(null); }
    if (cropSrc) { URL.revokeObjectURL(cropSrc); setCropSrc(null); }
    setCapturedBlob(null);
    setCameraState("closed");
    setCameraError(null);
  }

  useEffect(() => {
    if (cameraState === "requesting") startStream(facingMode);
    return () => { if (cameraState === "closed") stopStream(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraState]);

  const prevFacingRef = useRef(facingMode);
  useEffect(() => {
    if (cameraState === "viewfinder" && !cameraError && prevFacingRef.current !== facingMode) {
      prevFacingRef.current = facingMode;
      startStream(facingMode);
    }
  }, [facingMode, cameraState, cameraError, startStream]);

  useEffect(() => { return () => { stopStream(); }; }, [stopStream]);

  // ── Capture → crop ────────────────────────────────────────────────────────

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (facingMode === "user") { ctx.translate(w, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, w, h);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      // Go to cropping step first
      setCropSrc(url);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
      stopStream(); // free the camera while user crops
      setCameraState("cropping");
    }, "image/jpeg", 0.92);
  }

  // ── Apply crop ────────────────────────────────────────────────────────────

  async function applyCrop() {
    if (!cropSrc || !croppedAreaPixels) return;
    setCropping(true);
    try {
      const blob = await getCroppedBlob(cropSrc, croppedAreaPixels);
      const url = URL.createObjectURL(blob);
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      setCapturedUrl(url);
      setCapturedBlob(blob);
      setCameraState("preview");
    } catch (err) {
      log("Crop failed", err);
    } finally {
      setCropping(false);
    }
  }

  function skipCrop() {
    // Keep the raw blob without cropping
    if (!cropSrc) return;
    // Re-fetch blob from the cropSrc object URL
    fetch(cropSrc)
      .then((r) => r.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        if (capturedUrl) URL.revokeObjectURL(capturedUrl);
        setCapturedUrl(url);
        setCapturedBlob(blob);
        setCameraState("preview");
      });
  }

  // ── Keep / retake ──────────────────────────────────────────────────────────

  function keepPhoto() {
    if (!capturedBlob) return;
    onAddPhotos([new File([capturedBlob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })]);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setCropSrc(null);
    streamRef.current = null;
    setCameraState("requesting");
  }

  function retake() {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCapturedUrl(null);
    setCapturedBlob(null);
    setCropSrc(null);
    streamRef.current = null;
    setCameraState("requesting");
  }

  function done() {
    if (capturedBlob) {
      onAddPhotos([new File([capturedBlob], `photo-${Date.now()}.jpg`, { type: "image/jpeg" })]);
    }
    closeCamera();
  }

  function flipCamera() {
    setFacingMode((m) => m === "environment" ? "user" : "environment");
  }

  // ── Gallery / file input ───────────────────────────────────────────────────

  function handleGalleryFiles(files: FileList | null) {
    if (!files) return;
    const valid = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (valid.length === 0) return;
    // Send gallery photos straight to crop
    const url = URL.createObjectURL(valid[0]);
    setCropSrc(url);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedUrl(null);
    setCapturedBlob(null);
    // If multiple files selected, add extras directly (no crop for them)
    if (valid.length > 1) onAddPhotos(valid.slice(1));
    setCameraState("cropping");
  }

  function handlePermissionFallback() {
    closeCamera();
    fallbackCameraRef.current?.click();
  }

  const aspect = ASPECT_OPTIONS[aspectIndex].value;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-3">
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
        <div className="flex gap-2">
          <button type="button" onClick={openCamera}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 text-stone-500 hover:text-amber-600 rounded-xl transition-colors text-sm font-medium">
            <Camera className="w-4 h-4" />
            Camera
          </button>
          <button type="button" onClick={() => galleryRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-3 border-2 border-dashed border-stone-300 hover:border-amber-400 hover:bg-amber-50 text-stone-500 hover:text-amber-600 rounded-xl transition-colors text-sm font-medium">
            <ImagePlus className="w-4 h-4" />
            Gallery
          </button>
        </div>
        {photos.length === 0 && (
          <p className="text-center text-xs text-stone-400">Add photos of the object (optional but helpful)</p>
        )}
      </div>

      {/* Hidden inputs */}
      <input ref={galleryRef} type="file" accept="image/*" multiple className="hidden"
        onChange={(e) => handleGalleryFiles(e.target.files)} />
      <input ref={fallbackCameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => handleGalleryFiles(e.target.files)} />
      <canvas ref={canvasRef} className="hidden" />

      {/* ── Camera modal ──────────────────────────────────────────────────── */}
      {cameraState !== "closed" && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" style={{ height: "100dvh" }}>

          {/* Close */}
          <button onClick={closeCamera}
            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/60 hover:bg-black/80 text-white rounded-full flex items-center justify-center"
            aria-label="Close camera">
            <X className="w-5 h-5" />
          </button>

          {/* Photos kept badge */}
          {photos.length > 0 && (
            <div className="absolute top-4 left-4 z-10 px-3 py-1 bg-amber-500 text-white text-sm font-semibold rounded-full">
              {photos.length} kept
            </div>
          )}

          {/* ── Requesting ── */}
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
                      <p className="text-stone-400 text-sm max-w-xs">Click the camera/lock icon in your browser address bar and allow camera access, then try again.</p>
                      <button onClick={handlePermissionFallback} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">Open file picker instead</button>
                    </>
                  )}
                  {cameraError === "no-camera" && (
                    <>
                      <p className="text-white text-lg font-medium">No camera found</p>
                      <p className="text-stone-400 text-sm">No camera device was detected.</p>
                      <button onClick={closeCamera} className="px-5 py-2.5 bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded-xl">Close</button>
                    </>
                  )}
                  {cameraError === "in-use" && (
                    <>
                      <p className="text-white text-lg font-medium">Camera in use</p>
                      <p className="text-stone-400 text-sm max-w-xs">Another app is using the camera. Close it and try again.</p>
                      <button onClick={() => startStream(facingMode)} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">Try again</button>
                    </>
                  )}
                  {(cameraError === "unavailable" || cameraError === "no-api") && (
                    <>
                      <p className="text-white text-lg font-medium">
                        {cameraError === "no-api" ? "Camera requires HTTPS" : "Camera unavailable"}
                      </p>
                      <p className="text-stone-400 text-sm max-w-xs">
                        {cameraError === "no-api"
                          ? "Browser camera only works on localhost or an https:// connection."
                          : "The camera could not be started."}
                      </p>
                      <button onClick={handlePermissionFallback} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-xl">Open file picker instead</button>
                    </>
                  )}
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="flex-1 min-h-0 w-full object-cover"
                    style={facingMode === "user" ? { transform: "scaleX(-1)" } : undefined}
                    onLoadedMetadata={(e) => {
                      const v = e.currentTarget;
                      log("Video metadata loaded", { width: v.videoWidth, height: v.videoHeight });
                    }}
                    onPlay={() => log("Video playing")}
                    onError={(e) => log("Video element error", e)}
                  />
                  {/* Controls bar */}
                  <div className="flex items-center justify-center gap-8 pt-6 bg-black"
                    style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                    {/* Flip */}
                    <button onClick={flipCamera} disabled={!hasMultipleCameras}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${hasMultipleCameras ? "bg-stone-700 hover:bg-stone-600 text-white" : "bg-stone-800 text-stone-600 cursor-default"}`}
                      aria-label="Flip camera">
                      <SwitchCamera className="w-5 h-5" />
                    </button>
                    {/* Shutter */}
                    <button onClick={capturePhoto}
                      className="w-20 h-20 rounded-full bg-white hover:bg-stone-100 active:scale-95 transition-all shadow-lg flex items-center justify-center"
                      aria-label="Take photo">
                      <div className="w-16 h-16 rounded-full bg-white border-4 border-stone-300" />
                    </button>
                    {/* Done */}
                    <button onClick={closeCamera} disabled={photos.length === 0}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${photos.length > 0 ? "bg-amber-500 hover:bg-amber-600 text-white" : "bg-stone-800 text-stone-600 cursor-default"}`}
                      aria-label="Done">
                      <Check className="w-5 h-5" />
                    </button>
                  </div>
                </>
              )}
            </>
          )}

          {/* ── Crop ── */}
          {cameraState === "cropping" && cropSrc && (
            <>
              {/* Aspect ratio pills */}
              <div className="flex items-center justify-center gap-2 py-3 bg-black z-10">
                {ASPECT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt.label}
                    onClick={() => setAspectIndex(i)}
                    className="px-3 py-1 text-xs font-semibold rounded-full transition-colors"
                    style={{
                      background: aspectIndex === i ? "#f59e0b" : "#374151",
                      color: aspectIndex === i ? "#fff" : "#9ca3af",
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {/* Cropper */}
              <div className="flex-1 min-h-0 relative">
                <Cropper
                  image={cropSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={aspect ?? undefined}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={(_: Area, pixels: Area) => setCroppedAreaPixels(pixels)}
                  style={{
                    containerStyle: { background: "#000" },
                    cropAreaStyle: { border: "2px solid #f59e0b" },
                  }}
                />
              </div>

              {/* Crop controls */}
              <div className="flex items-center justify-between gap-3 px-6 pt-4 bg-black"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                <button
                  onClick={skipCrop}
                  className="flex items-center gap-2 px-4 py-2.5 bg-stone-700 hover:bg-stone-600 text-white text-sm font-semibold rounded-xl"
                >
                  <RotateCcw className="w-4 h-4" />
                  Skip
                </button>

                {/* Zoom slider */}
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.01}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="flex-1 accent-amber-500"
                  aria-label="Zoom"
                />

                <button
                  onClick={applyCrop}
                  disabled={cropping || !croppedAreaPixels}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
                >
                  <Crop className="w-4 h-4" />
                  {cropping ? "Cropping…" : "Crop & Save"}
                </button>
              </div>
            </>
          )}

          {/* ── Preview ── */}
          {cameraState === "preview" && capturedUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={capturedUrl} alt="Captured" className="flex-1 min-h-0 w-full object-contain" />
              <div className="flex items-center justify-center gap-3 pt-5 bg-black"
                style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}>
                <button onClick={retake}
                  className="flex items-center gap-2 px-4 py-3 bg-stone-700 hover:bg-stone-600 text-white font-semibold rounded-2xl text-sm">
                  <RotateCcw className="w-4 h-4" /> Retake
                </button>
                <button onClick={keepPhoto}
                  className="flex items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white font-semibold rounded-2xl text-sm">
                  <Camera className="w-4 h-4" /> Keep & shoot more
                </button>
                <button onClick={done}
                  className="flex items-center gap-2 px-4 py-3 bg-white hover:bg-stone-100 text-stone-900 font-semibold rounded-2xl text-sm">
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

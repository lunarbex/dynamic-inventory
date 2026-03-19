import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { storage } from "./firebase";
import { v4 as uuidv4 } from "uuid";

export async function uploadPhoto(file: File, userId: string): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `photos/${userId}/${uuidv4()}.${ext}`;
  console.log("[Storage] uploadPhoto — path:", path, "size:", file.size, "type:", file.type);

  try {
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    console.log("[Storage] uploadPhoto — success, url:", url.slice(0, 80) + "...");
    return url;
  } catch (err) {
    console.error("[Storage] uploadPhoto — FAILED:", err);
    throw err;
  }
}

export async function uploadAudio(blob: Blob, userId: string): Promise<string> {
  const ext = blob.type.includes("mp4") ? "m4a" : "webm";
  const path = `audio/${userId}/${uuidv4()}.${ext}`;
  console.log("[Storage] uploadAudio — path:", path, "size:", blob.size, "type:", blob.type);
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, blob);
  return getDownloadURL(storageRef);
}

export async function uploadPhotos(files: File[], userId: string): Promise<string[]> {
  console.log("[Storage] uploadPhotos — uploading", files.length, "files for user:", userId);
  return Promise.all(files.map((f) => uploadPhoto(f, userId)));
}

export async function deletePhoto(url: string): Promise<void> {
  try {
    const storageRef = ref(storage, url);
    await deleteObject(storageRef);
  } catch {
    // Ignore if already deleted
  }
}

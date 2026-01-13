import { createHash } from "crypto";

interface ImageData {
  imageId: string;
  hash: string;
  buffer: Buffer;
  uploadedAt: number;
  previewUrl: string;
}

// In-memory storage (Vercel-compatible: no filesystem operations)
const imageStore = new Map<string, ImageData>();
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 60 minutes
const MAX_AGE = 60 * 60 * 1000; // 60 minutes

// Generate hash from buffer
export function generateHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// Store image (in-memory only for Vercel compatibility)
export async function storeImage(
  buffer: Buffer,
  originalName: string
): Promise<{ imageId: string; hash: string; previewUrl: string }> {
  const hash = generateHash(buffer);
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const imageId = `${hash}.${ext}`;
  
  const previewUrl = `/api/images/${imageId}`;
  
  const imageData: ImageData = {
    imageId,
    hash,
    buffer, // Store buffer directly in memory
    uploadedAt: Date.now(),
    previewUrl,
  };
  
  imageStore.set(imageId, imageData);
  
  return { imageId, hash, previewUrl };
}

// Get image data
export function getImageData(imageId: string): ImageData | undefined {
  return imageStore.get(imageId);
}

// Get image buffer (from memory)
export async function getImageBuffer(imageId: string): Promise<Buffer | null> {
  const data = imageStore.get(imageId);
  return data?.buffer || null;
}

// Cleanup old images (memory only)
async function cleanupOldImages() {
  const now = Date.now();
  const toDelete: string[] = [];
  
  for (const [imageId, data] of imageStore.entries()) {
    if (now - data.uploadedAt > MAX_AGE) {
      toDelete.push(imageId);
    }
  }
  
  for (const imageId of toDelete) {
    imageStore.delete(imageId);
  }
}

// Start cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(cleanupOldImages, CLEANUP_INTERVAL);
  // Run once on startup
  cleanupOldImages();
}

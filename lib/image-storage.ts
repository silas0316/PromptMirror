import { createHash } from "crypto";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

interface ImageData {
  imageId: string;
  hash: string;
  filePath: string;
  uploadedAt: number;
  previewUrl: string;
}

// In-memory storage
const imageStore = new Map<string, ImageData>();
const TMP_DIR = join(process.cwd(), "tmp");
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 60 minutes
const MAX_AGE = 60 * 60 * 1000; // 60 minutes

// Ensure tmp directory exists
async function ensureTmpDir() {
  if (!existsSync(TMP_DIR)) {
    await mkdir(TMP_DIR, { recursive: true });
  }
}

// Generate hash from buffer
export function generateHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

// Store image
export async function storeImage(
  buffer: Buffer,
  originalName: string
): Promise<{ imageId: string; hash: string; previewUrl: string }> {
  await ensureTmpDir();
  
  const hash = generateHash(buffer);
  const ext = originalName.split(".").pop()?.toLowerCase() || "jpg";
  const imageId = `${hash}.${ext}`;
  const filePath = join(TMP_DIR, imageId);
  
  await writeFile(filePath, buffer);
  
  const previewUrl = `/api/images/${imageId}`;
  
  const imageData: ImageData = {
    imageId,
    hash,
    filePath,
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

// Get image buffer
export async function getImageBuffer(imageId: string): Promise<Buffer | null> {
  const data = imageStore.get(imageId);
  if (!data) return null;
  
  try {
    return await readFile(data.filePath);
  } catch {
    return null;
  }
}

// Cleanup old images
async function cleanupOldImages() {
  const now = Date.now();
  const toDelete: string[] = [];
  
  for (const [imageId, data] of imageStore.entries()) {
    if (now - data.uploadedAt > MAX_AGE) {
      toDelete.push(imageId);
    }
  }
  
  for (const imageId of toDelete) {
    const data = imageStore.get(imageId);
    if (data) {
      try {
        await unlink(data.filePath);
      } catch {
        // Ignore errors
      }
      imageStore.delete(imageId);
    }
  }
}

// Start cleanup interval
if (typeof setInterval !== "undefined") {
  setInterval(cleanupOldImages, CLEANUP_INTERVAL);
  // Run once on startup
  cleanupOldImages();
}

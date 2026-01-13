import { AnalysisResponse } from "./schemas";

interface CachedAnalysis {
  analysis: AnalysisResponse;
  cachedAt: number;
}

const analysisCache = new Map<string, CachedAnalysis>();
const CACHE_TTL = 60 * 60 * 1000; // 60 minutes

export function cacheAnalysis(imageId: string, analysis: AnalysisResponse) {
  analysisCache.set(imageId, {
    analysis,
    cachedAt: Date.now(),
  });
}

export function getCachedAnalysis(imageId: string): AnalysisResponse | null {
  const cached = analysisCache.get(imageId);
  if (!cached) return null;

  // Check if expired
  if (Date.now() - cached.cachedAt > CACHE_TTL) {
    analysisCache.delete(imageId);
    return null;
  }

  return cached.analysis;
}

// Cleanup expired entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [imageId, cached] of analysisCache.entries()) {
      if (now - cached.cachedAt > CACHE_TTL) {
        analysisCache.delete(imageId);
      }
    }
  }, CACHE_TTL);
}

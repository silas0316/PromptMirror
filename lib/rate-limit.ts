// Simple in-memory rate limiting per IP

interface RateLimitData {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitData>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 10; // 10 requests per minute

export function checkRateLimit(ip: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const data = rateLimitStore.get(ip);
  
  if (!data || now > data.resetAt) {
    // New window
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return { allowed: true, remaining: MAX_REQUESTS - 1 };
  }
  
  if (data.count >= MAX_REQUESTS) {
    return { allowed: false, remaining: 0 };
  }
  
  data.count++;
  return { allowed: true, remaining: MAX_REQUESTS - data.count };
}

// Cleanup old entries periodically
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitStore.entries()) {
      if (now > data.resetAt) {
        rateLimitStore.delete(ip);
      }
    }
  }, WINDOW_MS);
}

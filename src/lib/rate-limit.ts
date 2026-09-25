import "server-only";

// Fixed-window, in-memory rate limiter. Good enough for a single demo server;
// Phase 2 replaces it with a shared store so limits hold across instances.
const globalForLimits = globalThis as unknown as { __academeLimits?: Map<string, { count: number; resetAt: number }> };
const buckets = (globalForLimits.__academeLimits ??= new Map());

/** Forget every counter. Only reachable through the test hook. */
export function resetRateLimits(): void {
  buckets.clear();
}

/** Returns true if the call is allowed, false once `key` exceeds `limit` in the window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    // Opportunistic cleanup keeps the map from growing without bound.
    if (buckets.size > 10_000) for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}

/** True once `key` has `limit` or more recorded failures in its current window. */
export function isLimited(key: string, limit: number): boolean {
  const bucket = buckets.get(key);
  return !!bucket && bucket.resetAt > Date.now() && bucket.count >= limit;
}

/** Record one failure against `key` (e.g. a wrong password). */
export function recordFailure(key: string, windowMs: number): void {
  rateLimit(key, Number.POSITIVE_INFINITY, windowMs);
}

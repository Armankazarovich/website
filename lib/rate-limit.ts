/**
 * Simple in-memory rate limiter for API routes.
 * Not shared across instances (ok for single-server deployment).
 */

const stores = new Map<string, Map<string, { count: number; resetTime: number }>>();

export function rateLimit(
  /** Unique name for this limiter (e.g. "reset-password") */
  name: string,
  /** Max requests per window */
  maxAttempts: number = 5,
  /** Window in ms (default: 15 min) */
  windowMs: number = 15 * 60 * 1000
) {
  if (!stores.has(name)) stores.set(name, new Map());
  const store = stores.get(name)!;

  // Periodic cleanup (every 100 calls)
  let callCount = 0;

  return {
    /** Returns true if allowed, false if rate-limited */
    check(key: string): boolean {
      const now = Date.now();

      // Cleanup stale entries periodically
      if (++callCount % 100 === 0) {
        for (const [k, v] of store) {
          if (now > v.resetTime) store.delete(k);
        }
      }

      const existing = store.get(key);
      if (!existing || now > existing.resetTime) {
        store.set(key, { count: 1, resetTime: now + windowMs });
        return true;
      }
      if (existing.count >= maxAttempts) {
        return false;
      }
      existing.count++;
      return true;
    },

    /** Remaining attempts for this key */
    remaining(key: string): number {
      const existing = store.get(key);
      if (!existing || Date.now() > existing.resetTime) return maxAttempts;
      return Math.max(0, maxAttempts - existing.count);
    },
  };
}

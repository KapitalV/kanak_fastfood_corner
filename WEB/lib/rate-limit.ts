/**
 * Production-safe rate limiter with Upstash Redis backend.
 *
 * When UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are configured,
 * rate limiting uses Upstash Redis (shared across all serverless instances).
 *
 * When the env vars are absent (local development), it falls back to a
 * bounded in-memory store that fails open on cold starts.
 */

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  ok: boolean;
  retryAfter: number;
}

// ─── Upstash Redis backend ───────────────────────────────────────────────────

function getUpstashRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return new Redis({ url, token });
}

// Cache Ratelimit instances by scope so we don't create a new one per request.
const upstashLimiters = new Map<string, Ratelimit>();

function getUpstashLimiter(
  scope: string,
  limit: number,
  windowMs: number,
): Ratelimit | null {
  const redis = getUpstashRedis();
  if (!redis) return null;

  const cacheKey = `${scope}:${limit}:${windowMs}`;
  let limiter = upstashLimiters.get(cacheKey);
  if (!limiter) {
    const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
    // Use sliding window for smoother rate limiting.
    limiter = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
      prefix: `rl:${scope}`,
      analytics: false,
    });
    upstashLimiters.set(cacheKey, limiter);
  }
  return limiter;
}

// ─── In-memory fallback (development / unconfigured environments) ────────────

const MAX_BUCKETS = 10_000;
const EVICTION_AGE_MS = 300_000; // 5 min
const CLEANUP_INTERVAL_MS = 60_000; // 1 min

type Entry = { count: number; resetAt: number };

const buckets = new Map<string, Entry>();
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  // Evict expired entries
  for (const [key, entry] of buckets) {
    if (now - entry.resetAt > EVICTION_AGE_MS) {
      buckets.delete(key);
    }
  }

  // Hard cap: if still over limit, drop oldest entries
  if (buckets.size > MAX_BUCKETS) {
    const sorted = [...buckets.entries()].sort(
      (a, b) => a[1].resetAt - b[1].resetAt,
    );
    const excess = sorted.length - MAX_BUCKETS;
    for (let i = 0; i < excess; i++) {
      buckets.delete(sorted[i][0]);
    }
  }
}

function inMemoryRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  cleanup();
  const now = Date.now();
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: windowMs };
  }

  current.count += 1;
  const retryAfter = Math.max(0, current.resetAt - now);
  return { ok: current.count <= limit, retryAfter };
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Rate-limit a request by key.
 *
 * Uses Upstash Redis when configured, in-memory otherwise.
 * Always returns synchronously-shaped result; the Upstash path is async
 * internally but we expose a unified async API.
 */
export async function rateLimit(
  key: string,
  limit = 20,
  windowMs = 60_000,
  scope = "default",
): Promise<RateLimitResult> {
  const upstash = getUpstashLimiter(scope, limit, windowMs);
  if (upstash) {
    const result = await upstash.limit(key);
    return {
      ok: result.success,
      retryAfter: result.reset ? Math.max(0, result.reset - Date.now()) : windowMs,
    };
  }
  return inMemoryRateLimit(`${scope}:${key}`, limit, windowMs);
}

/** Extract the client IP from x-forwarded-for, handling proxy chains. */
function extractIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
  );
}

/** Rate-limit key scoped to the client IP. */
export function requestKey(request: Request, scope: string): string {
  return `${scope}:ip:${extractIp(request)}`;
}

/** Rate-limit key scoped to an authenticated user ID. */
export function userKey(userId: string, scope: string): string {
  return `${scope}:user:${userId}`;
}

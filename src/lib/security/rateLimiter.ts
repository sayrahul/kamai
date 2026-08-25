import { NextRequest } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

declare global {
  var __kamai_rate_limit_store: Map<string, RateLimitEntry> | undefined;
}

if (!globalThis.__kamai_rate_limit_store) {
  globalThis.__kamai_rate_limit_store = new Map<string, RateLimitEntry>();
}

const rateLimitStore = globalThis.__kamai_rate_limit_store;

/**
 * Extracts client IP address reliably from Next.js request headers
 */
export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    // Return first IP if multiple are chained
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}

export interface RateLimitResult {
  isAllowed: boolean;
  remaining: number;
  resetTimeMs: number;
}

/**
 * In-memory sliding window rate limiter
 * @param key Unique key e.g. `admin_login:${ip}` or `auth_login:${ip}`
 * @param limit Maximum requests allowed within window
 * @param windowMs Time window in milliseconds
 */
export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Periodically clean expired keys to prevent memory leak
  if (rateLimitStore.size > 10000) {
    rateLimitStore.forEach((v, k) => {
      if (v.resetAt <= now) {
        rateLimitStore.delete(k);
      }
    });
  }

  if (!entry || entry.resetAt <= now) {
    // New or expired window
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      isAllowed: true,
      remaining: limit - 1,
      resetTimeMs: now + windowMs,
    };
  }

  if (entry.count < limit) {
    entry.count += 1;
    return {
      isAllowed: true,
      remaining: limit - entry.count,
      resetTimeMs: entry.resetAt,
    };
  }

  // Rate limit exceeded
  return {
    isAllowed: false,
    remaining: 0,
    resetTimeMs: entry.resetAt,
  };
}

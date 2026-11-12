export interface RateLimitEntry {
  count: number;
  resetTime: number;
}

export class MemoryRateLimiter {
  private clients: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 30, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;

    // Periodic cleanup every 2 minutes to prevent memory leak
    setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.clients.entries()) {
        if (now > entry.resetTime) {
          this.clients.delete(key);
        }
      }
    }, 120000);
  }

  public checkRateLimit(clientId: string): { allowed: boolean; remaining: number; resetInSec: number } {
    const now = Date.now();
    const entry = this.clients.get(clientId);

    if (!entry || now > entry.resetTime) {
      this.clients.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetInSec: Math.ceil(this.windowMs / 1000),
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetInSec: Math.ceil((entry.resetTime - now) / 1000),
      };
    }

    entry.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetInSec: Math.ceil((entry.resetTime - now) / 1000),
    };
  }
}

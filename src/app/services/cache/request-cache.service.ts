import { Injectable } from '@angular/core';

interface CacheEntry {
  data: any;
  timestamp: number;
}

@Injectable({ providedIn: 'root' })
export class RequestCacheService {
  private cache = new Map<string, CacheEntry>();
  private readonly DEFAULT_TTL_MS = 10 * 60 * 1000;

  get(key: string, ttlMs: number = this.DEFAULT_TTL_MS): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > ttlMs) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(prefix: string): void {
    for (const key of Array.from(this.cache.keys())) {
      if (key.startsWith(prefix)) this.cache.delete(key);
    }
  }

  invalidateMany(prefixes: string[]): void {
    prefixes.forEach(p => this.invalidate(p));
  }

  clearAll(): void {
    this.cache.clear();
  }
}
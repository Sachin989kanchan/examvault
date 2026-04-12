// ─── Simple in-memory TTL cache ───────────────────────────────────────────────
// Eliminates repeat DB reads for hot, rarely-changing data (categories,
// featured papers, paper details, user profiles).
//
// Single-instance safe. For multi-instance deployments (multiple Node processes
// or containers behind a load balancer), replace with Redis:
//   npm install ioredis
//   and swap get/set/del/flush with redis.get/set/del/keys+del calls.
//
// Usage:
//   const cache = require('./cache')
//   const hit = cache.get('categories')
//   if (hit) return sendSuccess(res, hit)
//   const data = await db.execute(...)
//   cache.set('categories', data, 300)   // TTL = 300 seconds
// ─────────────────────────────────────────────────────────────────────────────

class TTLCache {
  constructor() {
    this._store = new Map(); // key → { value, expiresAt }
    // Sweep expired keys every 60 seconds to prevent memory leaks
    this._sweepInterval = setInterval(() => this._sweep(), 60_000);
    this._sweepInterval.unref(); // don't block process exit
  }

  // Returns the cached value or null if missing / expired
  get(key) {
    const entry = this._store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      return null;
    }
    return entry.value;
  }

  // Stores a value. ttlSeconds defaults to 60.
  set(key, value, ttlSeconds = 60) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1_000,
    });
  }

  // Deletes a specific key (call after mutations)
  del(key) {
    this._store.delete(key);
  }

  // Deletes all keys matching a prefix (e.g. cache.flush('paper:'))
  flush(prefix = '') {
    if (!prefix) {
      this._store.clear();
      return;
    }
    for (const key of this._store.keys()) {
      if (key.startsWith(prefix)) this._store.delete(key);
    }
  }

  // Remove expired entries
  _sweep() {
    const now = Date.now();
    for (const [key, entry] of this._store.entries()) {
      if (now > entry.expiresAt) this._store.delete(key);
    }
  }

  get size() { return this._store.size; }
}

// Export a single shared instance used across the whole process
module.exports = new TTLCache();

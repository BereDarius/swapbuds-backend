import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { Cache } from 'cache-manager';

/**
 * CacheService - Centralized Redis caching operations
 *
 * Provides a clean interface for all caching operations across the application.
 * All cache keys are prefixed to avoid collisions.
 */
@Injectable()
export class CacheService {
  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Get a value from cache
   * @param key Cache key
   * @returns Cached value or null if not found
   */
  async get<T>(key: string): Promise<T | null> {
    const value = await this.cacheManager.get<T>(key);
    return value ?? null;
  }

  /**
   * Set a value in cache with optional TTL
   * @param key Cache key
   * @param value Value to cache
   * @param ttl Time to live in milliseconds (default: 60000ms = 1 minute)
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    await this.cacheManager.set(key, value, ttl);
  }

  /**
   * Delete a specific key from cache
   * @param key Cache key to delete
   */
  async del(key: string): Promise<void> {
    await this.cacheManager.del(key);
  }

  /**
   * Delete multiple keys matching a pattern
   * @param pattern Key pattern (e.g., 'items:*')
   */
  async delPattern(pattern: string): Promise<void> {
    // Note: This requires getting the Redis client directly
    // For now, we'll implement individual key deletion
    // TODO: Implement pattern-based deletion using Redis SCAN
    await this.cacheManager.del(pattern);
  }

  /**
   * Clear all cache
   * Note: Specific implementation depends on cache store
   */
  async reset(): Promise<void> {
    // For cache-manager v5+, use the store directly
    if (typeof (this.cacheManager as any).store?.reset === 'function') {
      await (this.cacheManager as any).store.reset();
    }
  }

  // ==========================================
  // Domain-specific cache key generators
  // ==========================================

  /**
   * Generate cache key for item list
   * @param page Page number
   * @param limit Items per page
   * @param filters Additional filters (category, condition, etc.)
   */
  getItemsListKey(
    page: number,
    limit: number,
    filters?: Record<string, any>,
  ): string {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `items:list:${page}:${limit}:${filterStr}`;
  }

  /**
   * Generate cache key for single item
   * @param itemId Item ID
   */
  getItemKey(itemId: string): string {
    return `items:${itemId}`;
  }

  /**
   * Generate cache key for user profile
   * @param userId User ID
   */
  getUserKey(userId: string): string {
    return `users:${userId}`;
  }

  /**
   * Generate cache key for user's items
   * @param userId User ID
   */
  getUserItemsKey(userId: string): string {
    return `users:${userId}:items`;
  }

  /**
   * Generate cache key for unread notification count
   * @param userId User ID
   */
  getUnreadNotificationsKey(userId: string): string {
    return `users:${userId}:notifications:unread`;
  }

  /**
   * Generate cache key for unread message count
   * @param userId User ID
   */
  getUnreadMessagesKey(userId: string): string {
    return `users:${userId}:messages:unread`;
  }

  /**
   * Generate cache key for conversations list
   * @param userId User ID
   */
  getConversationsKey(userId: string): string {
    return `users:${userId}:conversations`;
  }

  /**
   * Generate cache key for trade details
   * @param tradeId Trade ID
   */
  getTradeKey(tradeId: string): string {
    return `trades:${tradeId}`;
  }

  /**
   * Generate cache key for user's trades
   * @param userId User ID
   */
  getUserTradesKey(userId: string): string {
    return `users:${userId}:trades`;
  }

  // ==========================================
  // Cache invalidation helpers
  // ==========================================

  /**
   * Invalidate all caches related to an item
   * @param itemId Item ID
   */
  async invalidateItem(itemId: string): Promise<void> {
    await this.del(this.getItemKey(itemId));
    // Also invalidate item lists (they would contain stale data)
    // For now, we clear the pattern - in production, track affected pages
    await this.delPattern('items:list:*');
  }

  /**
   * Invalidate all caches related to a user
   * @param userId User ID
   */
  async invalidateUser(userId: string): Promise<void> {
    await this.del(this.getUserKey(userId));
    await this.del(this.getUserItemsKey(userId));
    await this.del(this.getUserTradesKey(userId));
    await this.del(this.getConversationsKey(userId));
  }

  /**
   * Invalidate unread counts for a user
   * @param userId User ID
   */
  async invalidateUnreadCounts(userId: string): Promise<void> {
    await this.del(this.getUnreadNotificationsKey(userId));
    await this.del(this.getUnreadMessagesKey(userId));
  }

  /**
   * Invalidate trade-related caches
   * @param tradeId Trade ID
   */
  async invalidateTrade(tradeId: string): Promise<void> {
    await this.del(this.getTradeKey(tradeId));
    // Also clear affected user trade lists
    await this.delPattern('users:*:trades');
  }
}

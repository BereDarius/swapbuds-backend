import { Injectable, Logger } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Cache statistics interface
 */
export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalRequests: number;
  operations: {
    get: number;
    set: number;
    del: number;
  };
  timestamp: Date;
}

/**
 * CacheMonitoringService - Tracks cache performance metrics
 *
 * Provides cache hit/miss tracking and exposes metrics
 * for monitoring cache effectiveness.
 */
@Injectable()
export class CacheMonitoringService {
  private readonly logger = new Logger(CacheMonitoringService.name);
  private hits = 0;
  private misses = 0;
  private operations = {
    get: 0,
    set: 0,
    del: 0,
  };
  private startTime = new Date();

  constructor(private readonly cacheService: CacheService) {}

  /**
   * Record a cache hit
   */
  recordHit(): void {
    this.hits++;
  }

  /**
   * Record a cache miss
   */
  recordMiss(): void {
    this.misses++;
  }

  /**
   * Record a get operation
   */
  recordGet(): void {
    this.operations.get++;
  }

  /**
   * Record a set operation
   */
  recordSet(): void {
    this.operations.set++;
  }

  /**
   * Record a delete operation
   */
  recordDel(): void {
    this.operations.del++;
  }

  /**
   * Get current cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.hits + this.misses;
    const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: Math.round(hitRate * 100) / 100, // Round to 2 decimal places
      totalRequests,
      operations: { ...this.operations },
      timestamp: new Date(),
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.hits = 0;
    this.misses = 0;
    this.operations = {
      get: 0,
      set: 0,
      del: 0,
    };
    this.startTime = new Date();
    this.logger.log('Cache statistics reset');
  }

  /**
   * Log current statistics
   */
  logStats(): void {
    const stats = this.getStats();
    this.logger.log(
      `Cache Stats - Hit Rate: ${stats.hitRate}% | Hits: ${stats.hits} | Misses: ${stats.misses} | Total: ${stats.totalRequests}`,
    );
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }
}

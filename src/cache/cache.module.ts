import { Global, Module } from '@nestjs/common';
import { CacheMonitoringService } from './cache-monitoring.service';
import { CacheWarmingService } from './cache-warming.service';
import { CacheController } from './cache.controller';
import { CacheService } from './cache.service';

/**
 * CacheModule - Global module for centralized caching
 *
 * This module is marked as @Global so CacheService is available
 * throughout the application without needing to import the module.
 *
 * Includes:
 * - CacheService: Core caching operations
 * - CacheWarmingService: Pre-populates cache on startup
 * - CacheMonitoringService: Tracks cache performance metrics
 * - CacheController: Exposes metrics endpoints
 */
@Global()
@Module({
  controllers: [CacheController],
  providers: [CacheService, CacheWarmingService, CacheMonitoringService],
  exports: [CacheService, CacheWarmingService, CacheMonitoringService],
})
export class CacheModule {}

// Export decorators and interceptors for convenience
export * from './cacheable.decorator';
export * from './http-cache.interceptor';

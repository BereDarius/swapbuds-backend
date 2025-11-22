import { Global, Module } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * CacheModule - Global module for centralized caching
 *
 * This module is marked as @Global so CacheService is available
 * throughout the application without needing to import the module.
 */
@Global()
@Module({
  providers: [CacheService],
  exports: [CacheService],
})
export class CacheModule {}

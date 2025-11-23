import { CacheService } from '@/cache/cache.service';
import { Injectable } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private cacheService: CacheService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      // Test Redis connection by setting and getting a test value
      const testKey = 'health-check-test';
      const testValue = Date.now().toString();

      await this.cacheService.set(testKey, testValue, 5);
      const result = await this.cacheService.get(testKey);

      const isHealthy = result === testValue;

      if (isHealthy) {
        return this.getStatus(key, true, {
          message: 'Redis is healthy',
        });
      }

      return this.getStatus(key, false, {
        message: 'Redis test failed',
      });
    } catch (error) {
      return this.getStatus(key, false, {
        message: error.message,
      });
    }
  }
}

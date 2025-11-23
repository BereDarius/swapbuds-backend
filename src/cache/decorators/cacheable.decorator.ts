import { CacheService } from '@/cache/cache.service';
import { Inject } from '@nestjs/common';

/**
 * Options for the @Cacheable decorator
 */
export interface CacheableOptions {
  /**
   * Time-to-live in milliseconds
   * @default 60000 (1 minute)
   */
  ttl?: number;

  /**
   * Function to generate cache key from method arguments
   * If not provided, uses method name + stringified args
   */
  keyGenerator?: (...args: any[]) => string;

  /**
   * Prefix for the cache key
   * @default className:methodName
   */
  prefix?: string;
}

/**
 * Method decorator that automatically caches method results
 *
 * @example
 * ```typescript
 * @Cacheable({ ttl: 300000, prefix: 'users' })
 * async getUserById(id: string) {
 *   return this.prisma.user.findUnique({ where: { id } });
 * }
 * ```
 */
export function Cacheable(options: CacheableOptions = {}) {
  const injectCacheService = Inject(CacheService);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    // Inject CacheService if not already injected
    injectCacheService(target, 'cacheService');

    const originalMethod = descriptor.value;
    const className = target.constructor.name;
    const defaultPrefix = `${className}:${propertyKey}`;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService;

      if (!cacheService) {
        console.warn(
          `CacheService not found in ${className}. Skipping cache for ${propertyKey}`,
        );
        return originalMethod.apply(this, args);
      }

      // Generate cache key
      let cacheKey: string;
      if (options.keyGenerator) {
        cacheKey = options.keyGenerator(...args);
      } else {
        const argsKey = args.length > 0 ? JSON.stringify(args) : 'noargs';
        cacheKey = `${options.prefix || defaultPrefix}:${argsKey}`;
      }

      // Try to get from cache
      const cached = await cacheService.get(cacheKey);
      if (cached !== null) {
        return cached;
      }

      // Cache miss - execute original method
      const result = await originalMethod.apply(this, args);

      // Cache the result
      const ttl = options.ttl ?? 60000; // Default 1 minute
      await cacheService.set(cacheKey, result, ttl);

      return result;
    };

    return descriptor;
  };
}

/**
 * Method decorator to invalidate cache after method execution
 *
 * @example
 * ```typescript
 * @CacheInvalidate(['users:*', 'items:*'])
 * async updateUser(id: string, data: UpdateUserDto) {
 *   return this.prisma.user.update({ where: { id }, data });
 * }
 * ```
 */
export function CacheInvalidate(
  keys: string[] | ((...args: any[]) => string[]),
) {
  const injectCacheService = Inject(CacheService);

  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor,
  ) {
    injectCacheService(target, 'cacheService');

    const originalMethod = descriptor.value;
    const className = target.constructor.name;

    descriptor.value = async function (...args: any[]) {
      const cacheService: CacheService = this.cacheService;

      // Execute original method
      const result = await originalMethod.apply(this, args);

      // Invalidate cache keys (don't let cache errors break the method)
      if (cacheService) {
        try {
          const keysToInvalidate =
            typeof keys === 'function' ? keys(...args) : keys;

          for (const key of keysToInvalidate) {
            await cacheService.del(key);
          }
        } catch (error) {
          console.error(
            `Cache invalidation failed in ${className}.${propertyKey}:`,
            error,
          );
        }
      } else {
        console.warn(
          `CacheService not found in ${className}. Skipping cache invalidation for ${propertyKey}`,
        );
      }

      return result;
    };

    return descriptor;
  };
}

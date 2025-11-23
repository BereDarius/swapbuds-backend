import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { CacheService } from './cache.service';

/**
 * Configuration for cache warming strategies
 */
export interface CacheWarmingConfig {
  /**
   * Whether cache warming is enabled
   * @default true
   */
  enabled?: boolean;

  /**
   * Number of items to pre-cache
   * @default 20
   */
  itemsCount?: number;

  /**
   * TTL for warmed cache entries (in milliseconds)
   * @default 300000 (5 minutes)
   */
  ttl?: number;
}

/**
 * CacheWarmingService - Pre-populates cache on application startup
 *
 * Implements OnModuleInit to warm cache with frequently accessed data:
 * - Recent items (first page)
 * - Popular items (most liked/commented)
 *
 * @example
 * ```typescript
 * // Automatically runs on app startup
 * ```
 */
@Injectable()
export class CacheWarmingService implements OnModuleInit {
  private readonly logger = new Logger(CacheWarmingService.name);
  private readonly config: Required<CacheWarmingConfig>;

  constructor(
    private readonly cacheService: CacheService,
    private readonly prisma: PrismaService,
    @Optional() config?: CacheWarmingConfig,
  ) {
    this.config = {
      enabled: config?.enabled ?? true,
      itemsCount: config?.itemsCount ?? 20,
      ttl: config?.ttl ?? 300000, // 5 minutes
    };
  }

  /**
   * Lifecycle hook - runs when module is initialized
   */
  async onModuleInit() {
    if (!this.config.enabled) {
      this.logger.log('Cache warming is disabled');
      return;
    }

    this.logger.log('Starting cache warming...');
    const startTime = Date.now();

    try {
      await Promise.all([this.warmRecentItems(), this.warmPopularItems()]);

      const duration = Date.now() - startTime;
      this.logger.log(`Cache warming completed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
      // Don't throw - app should start even if cache warming fails
    }
  }

  /**
   * Pre-cache recent items (first page)
   */
  private async warmRecentItems(): Promise<void> {
    try {
      const items = await this.prisma.item.findMany({
        take: this.config.itemsCount,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          images: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });

      // Transform and cache
      const transformedItems = items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        condition: item.condition,
        category: item.category,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        owner: {
          id: item.user.id,
          username: item.user.username,
          avatarUrl: item.user.avatarUrl,
        },
        images: item.images.map((img) => img.url),
        likesCount: item._count.likes,
        commentsCount: item._count.comments,
      }));

      const cacheKey = this.cacheService.getItemsListKey(0, 10);
      await this.cacheService.set(
        cacheKey,
        transformedItems.slice(0, 10),
        this.config.ttl,
      );

      this.logger.debug(
        `Warmed cache for ${transformedItems.length} recent items`,
      );
    } catch (error) {
      this.logger.error('Failed to warm recent items cache:', error);
    }
  }

  /**
   * Pre-cache popular items (most engagement)
   */
  private async warmPopularItems(): Promise<void> {
    try {
      const items = await this.prisma.item.findMany({
        take: 10,
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } },
        ],
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          images: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });

      // Cache individual popular items
      for (const item of items) {
        const transformedItem = {
          id: item.id,
          title: item.title,
          description: item.description,
          condition: item.condition,
          category: item.category,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          owner: {
            id: item.user.id,
            username: item.user.username,
            avatarUrl: item.user.avatarUrl,
          },
          images: item.images.map((img) => img.url),
          likesCount: item._count.likes,
          commentsCount: item._count.comments,
        };

        const cacheKey = this.cacheService.getItemKey(item.id);
        await this.cacheService.set(cacheKey, transformedItem, this.config.ttl);
      }

      this.logger.debug(`Warmed cache for ${items.length} popular items`);
    } catch (error) {
      this.logger.error('Failed to warm popular items cache:', error);
    }
  }

  /**
   * Manually trigger cache warming
   * Useful for scheduled tasks or admin endpoints
   */
  async warmCache(): Promise<void> {
    await this.onModuleInit();
  }
}

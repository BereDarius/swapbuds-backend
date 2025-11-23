import { CacheService } from '@/cache/cache.service';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { Response } from 'express';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

/**
 * Options for HTTP caching interceptor
 */
export interface HttpCacheOptions {
  /**
   * Time-to-live in seconds for Cache-Control max-age
   * @default 60
   */
  ttl?: number;

  /**
   * Whether to use ETags for conditional requests
   * @default true
   */
  useETag?: boolean;

  /**
   * Custom cache key generator
   */
  keyGenerator?: (req: any) => string;
}

/**
 * HTTP Cache Interceptor
 *
 * Implements HTTP caching with ETags and Cache-Control headers
 * Only caches GET requests with 200 OK responses
 *
 * @example
 * ```typescript
 * @UseInterceptors(new HttpCacheInterceptor({ ttl: 300 }))
 * @Get('items')
 * findAll() {
 *   return this.itemsService.findAll();
 * }
 * ```
 */
@Injectable()
export class HttpCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly cacheService: CacheService,
    private readonly options: HttpCacheOptions = {},
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    // Only cache GET requests
    if (request.method !== 'GET') {
      return next.handle();
    }

    // Generate cache key
    const cacheKey = this.options.keyGenerator
      ? this.options.keyGenerator(request)
      : this.generateCacheKey(request);

    // Try to get cached response
    const cached = await this.cacheService.get<{
      data: any;
      etag: string;
    }>(cacheKey);

    if (cached) {
      const { data, etag } = cached;

      // Check if client has a matching ETag
      const clientETag = request.headers['if-none-match'];
      if (this.options.useETag !== false && clientETag === etag) {
        // Client cache is still valid
        response.status(304);
        return of(null);
      }

      // Set cache headers
      this.setCacheHeaders(response, etag);

      return of(data);
    }

    // Cache miss - execute request and cache result
    return next.handle().pipe(
      tap(async (data) => {
        // Only cache successful responses
        if (response.statusCode === 200 && data) {
          const etag = this.generateETag(data);

          // Cache the response with ETag
          const ttl = (this.options.ttl ?? 60) * 1000; // Convert to ms
          await this.cacheService.set(cacheKey, { data, etag }, ttl);

          // Set cache headers
          this.setCacheHeaders(response, etag);
        }
      }),
    );
  }

  /**
   * Generate cache key from request
   */
  private generateCacheKey(request: any): string {
    const url = request.url;
    const userId = request.user?.id || 'anonymous';
    return `http-cache:${userId}:${url}`;
  }

  /**
   * Generate ETag from response data
   */
  private generateETag(data: any): string {
    const hash = crypto
      .createHash('md5')
      .update(JSON.stringify(data))
      .digest('hex');
    return `"${hash}"`;
  }

  /**
   * Set HTTP cache headers
   */
  private setCacheHeaders(response: Response, etag: string): void {
    const ttl = this.options.ttl ?? 60;

    if (this.options.useETag !== false) {
      response.setHeader('ETag', etag);
    }

    response.setHeader('Cache-Control', `public, max-age=${ttl}`);
    response.setHeader('Vary', 'Accept-Encoding');
  }
}

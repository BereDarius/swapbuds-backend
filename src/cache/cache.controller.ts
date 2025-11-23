import { Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CacheMonitoringService } from './cache-monitoring.service';

/**
 * CacheController - Exposes cache metrics and management endpoints
 *
 * Protected endpoints for monitoring and managing cache.
 * In production, these should be secured with admin-only access.
 */
@ApiTags('Cache')
@Controller('cache')
export class CacheController {
  constructor(private readonly monitoringService: CacheMonitoringService) {}

  /**
   * Get current cache statistics
   * GET /cache/stats
   */
  @Get('stats')
  getStats() {
    return this.monitoringService.getStats();
  }

  /**
   * Get cache health status
   * GET /cache/health
   */
  @Get('health')
  getHealth() {
    const stats = this.monitoringService.getStats();
    const uptime = this.monitoringService.getUptime();

    return {
      status: 'healthy',
      uptime,
      hitRate: stats.hitRate,
      totalRequests: stats.totalRequests,
    };
  }

  /**
   * Reset cache statistics
   * POST /cache/reset-stats
   */
  @Post('reset-stats')
  @HttpCode(200)
  resetStats() {
    this.monitoringService.reset();
    return {
      message: 'Cache statistics reset successfully',
    };
  }
}

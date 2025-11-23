import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';

/**
 * MonitoringController - Platform monitoring and metrics endpoints
 *
 * Provides endpoints for:
 * - Getting aggregated metrics
 * - Viewing error logs
 * - Checking performance statistics
 *
 * All endpoints require ADMIN role.
 */
@ApiTags('Monitoring')
@Controller('monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, AdminGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * Get aggregated metrics
   *
   * Returns comprehensive metrics including:
   * - API call counts by endpoint and status code
   * - Performance statistics (avg, p95, p99 response times)
   * - Error rates and counts
   * - Active user counts
   */
  @Get('metrics')
  @ApiOperation({ summary: 'Get aggregated platform metrics' })
  getMetrics() {
    return this.monitoringService.getMetrics();
  }

  /**
   * Get error logs
   *
   * Returns recent error logs with details about:
   * - Endpoint and method
   * - Error message and stack trace
   * - Timestamp
   * - User ID (if available)
   */
  @Get('errors')
  @ApiOperation({ summary: 'Get recent error logs' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Number of errors to return (default: 50)',
  })
  getErrors(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.monitoringService.getErrors(limitNum);
  }

  /**
   * Get performance statistics
   *
   * Returns performance metrics including:
   * - Average response time
   * - 95th percentile response time
   * - 99th percentile response time
   * - Slowest endpoints
   */
  @Get('performance')
  @ApiOperation({ summary: 'Get performance statistics' })
  getPerformance() {
    return this.monitoringService.getPerformanceStats();
  }
}

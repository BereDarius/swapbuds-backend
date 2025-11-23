import { PrismaService } from '@/prisma/prisma.service';
import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import {
  DiskHealthIndicator,
  HealthCheck,
  HealthCheckService,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from './redis.health';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaHealth: PrismaHealthIndicator,
    private memoryHealth: MemoryHealthIndicator,
    private diskHealth: DiskHealthIndicator,
    private redisHealth: RedisHealthIndicator,
    private prisma: PrismaService,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Get overall system health status' })
  @ApiResponse({ status: 200, description: 'System is healthy' })
  @ApiResponse({ status: 503, description: 'System is unhealthy' })
  check() {
    return this.health.check([
      // Database health
      () => this.prismaHealth.pingCheck('database', this.prisma),

      // Redis health
      () => this.redisHealth.isHealthy('redis'),

      // Memory health (heap should not exceed 300MB)
      () => this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024),

      // Memory health (RSS should not exceed 500MB)
      () => this.memoryHealth.checkRSS('memory_rss', 500 * 1024 * 1024),

      // Disk health (storage should have at least 5GB free)
      () =>
        this.diskHealth.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }

  @Get('database')
  @HealthCheck()
  @ApiOperation({ summary: 'Check database health' })
  @ApiResponse({ status: 200, description: 'Database is healthy' })
  @ApiResponse({ status: 503, description: 'Database is unhealthy' })
  checkDatabase() {
    return this.health.check([
      () => this.prismaHealth.pingCheck('database', this.prisma),
    ]);
  }

  @Get('redis')
  @HealthCheck()
  @ApiOperation({ summary: 'Check Redis health' })
  @ApiResponse({ status: 200, description: 'Redis is healthy' })
  @ApiResponse({ status: 503, description: 'Redis is unhealthy' })
  checkRedis() {
    return this.health.check([() => this.redisHealth.isHealthy('redis')]);
  }

  @Get('memory')
  @HealthCheck()
  @ApiOperation({ summary: 'Check memory health' })
  @ApiResponse({ status: 200, description: 'Memory usage is healthy' })
  @ApiResponse({ status: 503, description: 'Memory usage is unhealthy' })
  checkMemory() {
    return this.health.check([
      () => this.memoryHealth.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memoryHealth.checkRSS('memory_rss', 500 * 1024 * 1024),
    ]);
  }

  @Get('disk')
  @HealthCheck()
  @ApiOperation({ summary: 'Check disk health' })
  @ApiResponse({ status: 200, description: 'Disk space is healthy' })
  @ApiResponse({ status: 503, description: 'Disk space is unhealthy' })
  checkDisk() {
    return this.health.check([
      () =>
        this.diskHealth.checkStorage('disk', {
          path: '/',
          thresholdPercent: 0.9,
        }),
    ]);
  }
}

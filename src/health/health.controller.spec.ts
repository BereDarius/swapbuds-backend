import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  DiskHealthIndicator,
  HealthCheckResult,
  HealthCheckService,
  HealthIndicatorResult,
  MemoryHealthIndicator,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health';

describe('HealthController', () => {
  let controller: HealthController;

  const mockHealthyResult: HealthIndicatorResult = {
    database: {
      status: 'up',
    },
  };

  const mockHealthCheckService = {
    check: jest.fn(),
  };

  const mockPrismaHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn(),
    checkRSS: jest.fn(),
  };

  const mockDiskHealthIndicator = {
    checkStorage: jest.fn(),
  };

  const mockRedisHealthIndicator = {
    isHealthy: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: mockHealthCheckService,
        },
        {
          provide: PrismaHealthIndicator,
          useValue: mockPrismaHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: RedisHealthIndicator,
          useValue: mockRedisHealthIndicator,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('check (overall health)', () => {
    it('should return healthy status when all checks pass', async () => {
      const healthyResponse: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResponse);

      const result = await controller.check();

      expect(result).toEqual(healthyResponse);
      expect(mockHealthCheckService.check).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
          expect.any(Function),
        ]),
      );
      expect(mockHealthCheckService.check).toHaveBeenCalledTimes(1);
    });

    it('should return unhealthy status when any check fails', async () => {
      const unhealthyResponse: HealthCheckResult = {
        status: 'error',
        info: {
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
        error: {
          database: { status: 'down', message: 'Database connection failed' },
        },
        details: {
          database: { status: 'down', message: 'Database connection failed' },
          redis: { status: 'up' },
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
          disk: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(unhealthyResponse);

      const result = await controller.check();

      expect(result).toEqual(unhealthyResponse);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('database');
    });

    it('should check all health indicators', async () => {
      const healthyResponse: HealthCheckResult = {
        status: 'ok',
        info: {},
        error: {},
        details: {},
      };

      mockHealthCheckService.check.mockImplementation(async (checks) => {
        // Execute all check functions to verify they're properly configured
        for (const check of checks) {
          await check();
        }
        return healthyResponse;
      });

      mockPrismaHealthIndicator.pingCheck.mockResolvedValue(mockHealthyResult);
      mockRedisHealthIndicator.isHealthy.mockResolvedValue(mockHealthyResult);
      mockMemoryHealthIndicator.checkHeap.mockResolvedValue(mockHealthyResult);
      mockMemoryHealthIndicator.checkRSS.mockResolvedValue(mockHealthyResult);
      mockDiskHealthIndicator.checkStorage.mockResolvedValue(mockHealthyResult);

      await controller.check();

      expect(mockPrismaHealthIndicator.pingCheck).toHaveBeenCalledWith(
        'database',
        mockPrismaService,
      );
      expect(mockRedisHealthIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(mockMemoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        300 * 1024 * 1024,
      );
      expect(mockMemoryHealthIndicator.checkRSS).toHaveBeenCalledWith(
        'memory_rss',
        500 * 1024 * 1024,
      );
      expect(mockDiskHealthIndicator.checkStorage).toHaveBeenCalledWith(
        'disk',
        {
          path: '/',
          thresholdPercent: 0.9,
        },
      );
    });
  });

  describe('checkDatabase', () => {
    it('should return healthy status when database is available', async () => {
      const healthyResponse: HealthCheckResult = {
        status: 'ok',
        info: {
          database: { status: 'up' },
        },
        error: {},
        details: {
          database: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResponse);

      const result = await controller.checkDatabase();

      expect(result).toEqual(healthyResponse);
      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('database');
    });

    it('should return unhealthy status when database is unavailable', async () => {
      const unhealthyResponse: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          database: { status: 'down', message: 'Connection refused' },
        },
        details: {
          database: { status: 'down', message: 'Connection refused' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(unhealthyResponse);

      const result = await controller.checkDatabase();

      expect(result).toEqual(unhealthyResponse);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('database');
    });

    it('should call prismaHealthIndicator.pingCheck', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        for (const check of checks) {
          await check();
        }
        return { status: 'ok', info: {}, error: {}, details: {} };
      });

      mockPrismaHealthIndicator.pingCheck.mockResolvedValue(mockHealthyResult);

      await controller.checkDatabase();

      expect(mockPrismaHealthIndicator.pingCheck).toHaveBeenCalledWith(
        'database',
        mockPrismaService,
      );
      expect(mockPrismaHealthIndicator.pingCheck).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkRedis', () => {
    it('should return healthy status when Redis is available', async () => {
      const healthyResponse: HealthCheckResult = {
        status: 'ok',
        info: {
          redis: { status: 'up', message: 'Redis is healthy' },
        },
        error: {},
        details: {
          redis: { status: 'up', message: 'Redis is healthy' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResponse);

      const result = await controller.checkRedis();

      expect(result).toEqual(healthyResponse);
      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('redis');
    });

    it('should return unhealthy status when Redis is unavailable', async () => {
      const unhealthyResponse: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          redis: { status: 'down', message: 'Connection timeout' },
        },
        details: {
          redis: { status: 'down', message: 'Connection timeout' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(unhealthyResponse);

      const result = await controller.checkRedis();

      expect(result).toEqual(unhealthyResponse);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('redis');
    });

    it('should call redisHealthIndicator.isHealthy', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        for (const check of checks) {
          await check();
        }
        return { status: 'ok', info: {}, error: {}, details: {} };
      });

      mockRedisHealthIndicator.isHealthy.mockResolvedValue(mockHealthyResult);

      await controller.checkRedis();

      expect(mockRedisHealthIndicator.isHealthy).toHaveBeenCalledWith('redis');
      expect(mockRedisHealthIndicator.isHealthy).toHaveBeenCalledTimes(1);
    });
  });

  describe('checkMemory', () => {
    it('should return healthy status when memory usage is normal', async () => {
      const healthyResponse: HealthCheckResult = {
        status: 'ok',
        info: {
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
        error: {},
        details: {
          memory_heap: { status: 'up' },
          memory_rss: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResponse);

      const result = await controller.checkMemory();

      expect(result).toEqual(healthyResponse);
      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('memory_heap');
      expect(result.info).toHaveProperty('memory_rss');
    });

    it('should return unhealthy status when heap memory exceeds threshold', async () => {
      const unhealthyResponse: HealthCheckResult = {
        status: 'error',
        info: {
          memory_rss: { status: 'up' },
        },
        error: {
          memory_heap: { status: 'down', message: 'Heap memory exceeded' },
        },
        details: {
          memory_heap: { status: 'down', message: 'Heap memory exceeded' },
          memory_rss: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(unhealthyResponse);

      const result = await controller.checkMemory();

      expect(result).toEqual(unhealthyResponse);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('memory_heap');
    });

    it('should return unhealthy status when RSS memory exceeds threshold', async () => {
      const unhealthyResponse: HealthCheckResult = {
        status: 'error',
        info: {
          memory_heap: { status: 'up' },
        },
        error: {
          memory_rss: { status: 'down', message: 'RSS memory exceeded' },
        },
        details: {
          memory_heap: { status: 'up' },
          memory_rss: { status: 'down', message: 'RSS memory exceeded' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(unhealthyResponse);

      const result = await controller.checkMemory();

      expect(result).toEqual(unhealthyResponse);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('memory_rss');
    });

    it('should call memory health checks with correct thresholds', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        for (const check of checks) {
          await check();
        }
        return { status: 'ok', info: {}, error: {}, details: {} };
      });

      mockMemoryHealthIndicator.checkHeap.mockResolvedValue(mockHealthyResult);
      mockMemoryHealthIndicator.checkRSS.mockResolvedValue(mockHealthyResult);

      await controller.checkMemory();

      expect(mockMemoryHealthIndicator.checkHeap).toHaveBeenCalledWith(
        'memory_heap',
        300 * 1024 * 1024, // 300MB
      );
      expect(mockMemoryHealthIndicator.checkRSS).toHaveBeenCalledWith(
        'memory_rss',
        500 * 1024 * 1024, // 500MB
      );
    });
  });

  describe('checkDisk', () => {
    it('should return healthy status when disk space is sufficient', async () => {
      const healthyResponse: HealthCheckResult = {
        status: 'ok',
        info: {
          disk: { status: 'up' },
        },
        error: {},
        details: {
          disk: { status: 'up' },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(healthyResponse);

      const result = await controller.checkDisk();

      expect(result).toEqual(healthyResponse);
      expect(result.status).toBe('ok');
      expect(result.info).toHaveProperty('disk');
    });

    it('should return unhealthy status when disk space is low', async () => {
      const unhealthyResponse: HealthCheckResult = {
        status: 'error',
        info: {},
        error: {
          disk: {
            status: 'down',
            message: 'Disk space below threshold',
          },
        },
        details: {
          disk: {
            status: 'down',
            message: 'Disk space below threshold',
          },
        },
      };

      mockHealthCheckService.check.mockResolvedValue(unhealthyResponse);

      const result = await controller.checkDisk();

      expect(result).toEqual(unhealthyResponse);
      expect(result.status).toBe('error');
      expect(result.error).toHaveProperty('disk');
    });

    it('should call diskHealthIndicator.checkStorage with correct parameters', async () => {
      mockHealthCheckService.check.mockImplementation(async (checks) => {
        for (const check of checks) {
          await check();
        }
        return { status: 'ok', info: {}, error: {}, details: {} };
      });

      mockDiskHealthIndicator.checkStorage.mockResolvedValue(mockHealthyResult);

      await controller.checkDisk();

      expect(mockDiskHealthIndicator.checkStorage).toHaveBeenCalledWith(
        'disk',
        {
          path: '/',
          thresholdPercent: 0.9, // 90% threshold
        },
      );
      expect(mockDiskHealthIndicator.checkStorage).toHaveBeenCalledTimes(1);
    });
  });
});

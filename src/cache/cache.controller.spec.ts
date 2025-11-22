import { Test, TestingModule } from '@nestjs/testing';
import { CacheMonitoringService } from './cache-monitoring.service';
import { CacheController } from './cache.controller';

describe('CacheController', () => {
  let controller: CacheController;
  let monitoringService: CacheMonitoringService;

  const mockMonitoringService = {
    getStats: jest.fn(),
    getUptime: jest.fn(),
    reset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CacheController],
      providers: [
        {
          provide: CacheMonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    }).compile();

    controller = module.get<CacheController>(CacheController);
    monitoringService = module.get<CacheMonitoringService>(
      CacheMonitoringService,
    );

    jest.clearAllMocks();
  });

  describe('getStats', () => {
    it('should return cache statistics', () => {
      const mockStats = {
        hits: 100,
        misses: 20,
        hitRate: 83.33,
        totalRequests: 120,
        operations: {
          get: 120,
          set: 50,
          del: 10,
        },
        timestamp: new Date(),
      };
      mockMonitoringService.getStats.mockReturnValue(mockStats);

      const result = controller.getStats();

      expect(monitoringService.getStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });

  describe('getHealth', () => {
    it('should return cache health status', () => {
      const mockStats = {
        hits: 100,
        misses: 20,
        hitRate: 83.33,
        totalRequests: 120,
        operations: {
          get: 120,
          set: 50,
          del: 10,
        },
        timestamp: new Date(),
      };
      mockMonitoringService.getStats.mockReturnValue(mockStats);
      mockMonitoringService.getUptime.mockReturnValue(3600000); // 1 hour

      const result = controller.getHealth();

      expect(monitoringService.getStats).toHaveBeenCalled();
      expect(monitoringService.getUptime).toHaveBeenCalled();
      expect(result).toEqual({
        status: 'healthy',
        uptime: 3600000,
        hitRate: 83.33,
        totalRequests: 120,
      });
    });
  });

  describe('resetStats', () => {
    it('should reset cache statistics', () => {
      const result = controller.resetStats();

      expect(monitoringService.reset).toHaveBeenCalled();
      expect(result).toEqual({
        message: 'Cache statistics reset successfully',
      });
    });
  });
});

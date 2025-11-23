import { mockCacheService } from '@/test/mocks/cache.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheMonitoringService } from './cache-monitoring.service';
import { CacheService } from './cache.service';

describe('CacheMonitoringService', () => {
  let service: CacheMonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheMonitoringService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<CacheMonitoringService>(CacheMonitoringService);
  });

  describe('recordHit', () => {
    it('should increment hit counter', () => {
      service.recordHit();
      service.recordHit();

      const stats = service.getStats();
      expect(stats.hits).toBe(2);
    });
  });

  describe('recordMiss', () => {
    it('should increment miss counter', () => {
      service.recordMiss();
      service.recordMiss();
      service.recordMiss();

      const stats = service.getStats();
      expect(stats.misses).toBe(3);
    });
  });

  describe('recordGet', () => {
    it('should increment get operation counter', () => {
      service.recordGet();

      const stats = service.getStats();
      expect(stats.operations.get).toBe(1);
    });
  });

  describe('recordSet', () => {
    it('should increment set operation counter', () => {
      service.recordSet();
      service.recordSet();

      const stats = service.getStats();
      expect(stats.operations.set).toBe(2);
    });
  });

  describe('recordDel', () => {
    it('should increment del operation counter', () => {
      service.recordDel();

      const stats = service.getStats();
      expect(stats.operations.del).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', () => {
      service.recordHit();
      service.recordHit();
      service.recordHit();
      service.recordMiss();
      service.recordGet();
      service.recordSet();
      service.recordDel();

      const stats = service.getStats();

      expect(stats.hits).toBe(3);
      expect(stats.misses).toBe(1);
      expect(stats.totalRequests).toBe(4);
      expect(stats.hitRate).toBe(75); // 3/4 * 100
      expect(stats.operations.get).toBe(1);
      expect(stats.operations.set).toBe(1);
      expect(stats.operations.del).toBe(1);
      expect(stats.timestamp).toBeInstanceOf(Date);
    });

    it('should calculate 0% hit rate when no requests', () => {
      const stats = service.getStats();

      expect(stats.hitRate).toBe(0);
      expect(stats.totalRequests).toBe(0);
    });

    it('should round hit rate to 2 decimal places', () => {
      service.recordHit();
      service.recordMiss();
      service.recordMiss();

      const stats = service.getStats();

      expect(stats.hitRate).toBe(33.33); // 1/3 * 100
    });
  });

  describe('reset', () => {
    it('should reset all counters', () => {
      service.recordHit();
      service.recordMiss();
      service.recordGet();
      service.recordSet();
      service.recordDel();

      service.reset();

      const stats = service.getStats();

      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
      expect(stats.totalRequests).toBe(0);
      expect(stats.operations.get).toBe(0);
      expect(stats.operations.set).toBe(0);
      expect(stats.operations.del).toBe(0);
    });
  });

  describe('getUptime', () => {
    it('should return uptime in milliseconds', async () => {
      const beforeUptime = service.getUptime();
      await new Promise((resolve) => setTimeout(resolve, 100));
      const afterUptime = service.getUptime();

      expect(afterUptime).toBeGreaterThan(beforeUptime);
      expect(afterUptime).toBeGreaterThanOrEqual(100);
    });
  });
});

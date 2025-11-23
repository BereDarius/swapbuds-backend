import { CacheService } from '@/cache/cache.service';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisHealthIndicator } from './redis.health';

describe('RedisHealthIndicator', () => {
  let indicator: RedisHealthIndicator;

  const mockCacheService = {
    set: jest.fn(),
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisHealthIndicator,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    indicator = module.get<RedisHealthIndicator>(RedisHealthIndicator);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(indicator).toBeDefined();
  });

  describe('isHealthy', () => {
    it('should return healthy status when Redis is working', async () => {
      // Mock Date.now to ensure consistent test value
      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

      const testValue = '12345'; // Use the mocked date value
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(testValue);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'up',
          message: 'Redis is healthy',
        },
      });

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'health-check-test',
        '12345',
        5,
      );
      expect(mockCacheService.get).toHaveBeenCalledWith('health-check-test');

      dateSpy.mockRestore();
    });

    it('should return unhealthy status when Redis test fails (value mismatch)', async () => {
      const wrongValue = '99999';

      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(wrongValue);

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Redis test failed',
        },
      });

      dateSpy.mockRestore();
    });

    it('should return unhealthy status when Redis set operation fails', async () => {
      const error = new Error('Connection refused');
      mockCacheService.set.mockRejectedValue(error);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Connection refused',
        },
      });

      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockCacheService.get).not.toHaveBeenCalled();
    });

    it('should return unhealthy status when Redis get operation fails', async () => {
      const error = new Error('Read timeout');
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockRejectedValue(error);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Read timeout',
        },
      });

      expect(mockCacheService.set).toHaveBeenCalled();
      expect(mockCacheService.get).toHaveBeenCalled();
    });

    it('should return unhealthy status when Redis returns null', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(null);

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Redis test failed',
        },
      });

      dateSpy.mockRestore();
    });

    it('should return unhealthy status when Redis returns undefined', async () => {
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(undefined);

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'Redis test failed',
        },
      });

      dateSpy.mockRestore();
    });

    it('should use a TTL of 5 seconds for the health check key', async () => {
      const testValue = Date.now().toString();
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(testValue);

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

      await indicator.isHealthy('redis');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'health-check-test',
        expect.any(String),
        5, // TTL in seconds
      );

      dateSpy.mockRestore();
    });

    it('should use a unique test key for each check', async () => {
      const testValue = Date.now().toString();
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(testValue);

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

      await indicator.isHealthy('redis');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'health-check-test',
        expect.any(String),
        5,
      );

      expect(mockCacheService.get).toHaveBeenCalledWith('health-check-test');

      dateSpy.mockRestore();
    });

    it('should handle network timeout errors', async () => {
      const error = new Error('ETIMEDOUT');
      mockCacheService.set.mockRejectedValue(error);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'ETIMEDOUT',
        },
      });
    });

    it('should handle Redis server errors', async () => {
      const error = new Error('ERR Server closed the connection');
      mockCacheService.set.mockRejectedValue(error);

      const result = await indicator.isHealthy('redis');

      expect(result).toEqual({
        redis: {
          status: 'down',
          message: 'ERR Server closed the connection',
        },
      });
    });

    it('should work with different key names', async () => {
      const testValue = Date.now().toString();
      mockCacheService.set.mockResolvedValue(undefined);
      mockCacheService.get.mockResolvedValue(testValue);

      const dateSpy = jest.spyOn(Date, 'now').mockReturnValue(12345);

      await indicator.isHealthy('custom-redis-key');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        'health-check-test',
        '12345',
        5,
      );
      expect(mockCacheService.get).toHaveBeenCalledWith('health-check-test');

      dateSpy.mockRestore();
    });
  });
});

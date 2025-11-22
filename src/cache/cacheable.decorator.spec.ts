import { Injectable } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';
import { Cacheable, CacheInvalidate } from './cacheable.decorator';

describe('Cacheable Decorator', () => {
  let testService: TestService;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  @Injectable()
  class TestService {
    constructor(public cacheService: CacheService) {}

    @Cacheable({ ttl: 5000, prefix: 'test' })
    async cachedMethod(id: string) {
      return { id, data: 'test-data' };
    }

    @Cacheable({
      ttl: 10000,
      keyGenerator: (userId: string) => `custom:${userId}`,
    })
    async customKeyMethod(userId: string) {
      return { userId, name: 'John' };
    }

    @Cacheable()
    async defaultOptionsMethod(param: string) {
      return { param };
    }

    @CacheInvalidate(['test:*', 'custom:*'])
    async invalidatingMethod(id: string) {
      return { id, updated: true };
    }

    @CacheInvalidate((id: string) => [`test:${id}`, `custom:${id}`])
    async dynamicInvalidatingMethod(id: string) {
      return { id, updated: true };
    }
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TestService,
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    testService = module.get<TestService>(TestService);
    cacheService = module.get<CacheService>(CacheService);

    jest.clearAllMocks();
  });

  describe('@Cacheable', () => {
    it('should cache method result on first call', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss

      const result = await testService.cachedMethod('test-id');

      expect(cacheService.get).toHaveBeenCalledWith('test:["test-id"]');
      expect(cacheService.set).toHaveBeenCalledWith(
        'test:["test-id"]',
        { id: 'test-id', data: 'test-data' },
        5000,
      );
      expect(result).toEqual({ id: 'test-id', data: 'test-data' });
    });

    it('should return cached result on subsequent calls', async () => {
      const cachedData = { id: 'test-id', data: 'cached-data' };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await testService.cachedMethod('test-id');

      expect(cacheService.get).toHaveBeenCalledWith('test:["test-id"]');
      expect(cacheService.set).not.toHaveBeenCalled(); // Should not set again
      expect(result).toEqual(cachedData);
    });

    it('should use custom key generator', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await testService.customKeyMethod('user-123');

      expect(cacheService.get).toHaveBeenCalledWith('custom:user-123');
      expect(cacheService.set).toHaveBeenCalledWith(
        'custom:user-123',
        { userId: 'user-123', name: 'John' },
        10000,
      );
      expect(result).toEqual({ userId: 'user-123', name: 'John' });
    });

    it('should use default options when none provided', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await testService.defaultOptionsMethod('test');

      expect(cacheService.get).toHaveBeenCalledWith(
        'TestService:defaultOptionsMethod:["test"]',
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'TestService:defaultOptionsMethod:["test"]',
        { param: 'test' },
        60000, // Default TTL
      );
      expect(result).toEqual({ param: 'test' });
    });

    it('should handle methods with no arguments', async () => {
      @Injectable()
      class NoArgsService {
        constructor(public cacheService: CacheService) {}

        @Cacheable({ prefix: 'noargs' })
        async getConstant() {
          return { constant: 'value' };
        }
      }

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          NoArgsService,
          {
            provide: CacheService,
            useValue: mockCacheService,
          },
        ],
      }).compile();

      const service = module.get<NoArgsService>(NoArgsService);
      mockCacheService.get.mockResolvedValue(null);

      const result = await service.getConstant();

      expect(cacheService.get).toHaveBeenCalledWith('noargs:noargs');
      expect(result).toEqual({ constant: 'value' });
    });
  });

  describe('@CacheInvalidate', () => {
    it('should invalidate static cache keys after method execution', async () => {
      const result = await testService.invalidatingMethod('test-id');

      expect(cacheService.del).toHaveBeenCalledWith('test:*');
      expect(cacheService.del).toHaveBeenCalledWith('custom:*');
      expect(cacheService.del).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: 'test-id', updated: true });
    });

    it('should invalidate dynamic cache keys based on arguments', async () => {
      const result = await testService.dynamicInvalidatingMethod('test-id');

      expect(cacheService.del).toHaveBeenCalledWith('test:test-id');
      expect(cacheService.del).toHaveBeenCalledWith('custom:test-id');
      expect(cacheService.del).toHaveBeenCalledTimes(2);
      expect(result).toEqual({ id: 'test-id', updated: true });
    });

    it('should execute method even if cache invalidation fails', async () => {
      mockCacheService.del.mockRejectedValue(new Error('Cache error'));

      // Should not throw
      const result = await testService.invalidatingMethod('test-id');

      expect(result).toEqual({ id: 'test-id', updated: true });
    });
  });
});

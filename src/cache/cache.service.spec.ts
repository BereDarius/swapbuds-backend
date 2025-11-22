import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheService } from './cache.service';

describe('CacheService', () => {
  let service: CacheService;
  let mockCacheManager: any;
  let mockRedisClient: any;

  beforeEach(async () => {
    // Mock Redis client with SCAN and pipeline support
    mockRedisClient = {
      scan: jest.fn(),
      pipeline: jest.fn(() => ({
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      })),
    };

    // Mock cache manager
    mockCacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      store: {
        client: mockRedisClient,
        reset: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CacheService,
        {
          provide: CACHE_MANAGER,
          useValue: mockCacheManager,
        },
      ],
    }).compile();

    service = module.get<CacheService>(CacheService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('get', () => {
    it('should return cached value if exists', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      mockCacheManager.get.mockResolvedValue(value);

      const result = await service.get(key);

      expect(result).toEqual(value);
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });

    it('should return null if value does not exist', async () => {
      const key = 'test-key';
      mockCacheManager.get.mockResolvedValue(undefined);

      const result = await service.get(key);

      expect(result).toBeNull();
      expect(mockCacheManager.get).toHaveBeenCalledWith(key);
    });
  });

  describe('set', () => {
    it('should set value without TTL when not provided', async () => {
      const key = 'test-key';
      const value = { data: 'test' };

      await service.set(key, value);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, undefined);
    });

    it('should set value with custom TTL', async () => {
      const key = 'test-key';
      const value = { data: 'test' };
      const ttl = 300000;

      await service.set(key, value, ttl);

      expect(mockCacheManager.set).toHaveBeenCalledWith(key, value, ttl);
    });
  });

  describe('del', () => {
    it('should delete a key', async () => {
      const key = 'test-key';

      await service.del(key);

      expect(mockCacheManager.del).toHaveBeenCalledWith(key);
    });
  });

  describe('delPattern', () => {
    it('should delete all keys matching pattern using SCAN', async () => {
      const pattern = 'items:*';
      const matchingKeys = ['items:1', 'items:2', 'items:3'];

      // Mock SCAN to return keys in one iteration
      mockRedisClient.scan.mockResolvedValueOnce(['0', matchingKeys]);

      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const deletedCount = await service.delPattern(pattern);

      expect(deletedCount).toBe(3);
      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
      expect(mockPipeline.del).toHaveBeenCalledWith('items:1');
      expect(mockPipeline.del).toHaveBeenCalledWith('items:2');
      expect(mockPipeline.del).toHaveBeenCalledWith('items:3');
      expect(mockPipeline.exec).toHaveBeenCalled();
    });

    it('should handle multiple SCAN iterations', async () => {
      const pattern = 'users:*';

      // Mock SCAN to return keys in multiple iterations
      mockRedisClient.scan
        .mockResolvedValueOnce(['1', ['users:1', 'users:2']])
        .mockResolvedValueOnce(['2', ['users:3']])
        .mockResolvedValueOnce(['0', []]);

      const mockPipeline = {
        del: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockRedisClient.pipeline.mockReturnValue(mockPipeline);

      const deletedCount = await service.delPattern(pattern);

      expect(deletedCount).toBe(3);
      expect(mockRedisClient.scan).toHaveBeenCalledTimes(3);
      expect(mockPipeline.del).toHaveBeenCalledTimes(3);
    });

    it('should return 0 when no keys match pattern', async () => {
      const pattern = 'nonexistent:*';

      // Mock SCAN to return no keys
      mockRedisClient.scan.mockResolvedValueOnce(['0', []]);

      const deletedCount = await service.delPattern(pattern);

      expect(deletedCount).toBe(0);
      expect(mockRedisClient.scan).toHaveBeenCalledWith(
        '0',
        'MATCH',
        pattern,
        'COUNT',
        100,
      );
      expect(mockRedisClient.pipeline).not.toHaveBeenCalled();
    });

    it('should throw error if Redis client not available', async () => {
      // Mock cache manager without client
      mockCacheManager.store.client = null;

      await expect(service.delPattern('test:*')).rejects.toThrow(
        'Redis client not available',
      );
    });
  });

  describe('reset', () => {
    it('should reset cache if store.reset is available', async () => {
      await service.reset();

      expect(mockCacheManager.store.reset).toHaveBeenCalled();
    });

    it('should handle store without reset method', async () => {
      mockCacheManager.store.reset = undefined;

      await expect(service.reset()).resolves.not.toThrow();
    });
  });

  describe('cache key generators', () => {
    it('should generate items list key', () => {
      const key = service.getItemsListKey(0, 20);
      expect(key).toBe('items:list:0:20:all');
    });

    it('should generate items list key with filters', () => {
      const filters = { category: 'ELECTRONICS' };
      const key = service.getItemsListKey(0, 20, filters);
      expect(key).toBe('items:list:0:20:{"category":"ELECTRONICS"}');
    });

    it('should generate user items key', () => {
      const key = service.getUserItemsKey('user-123');
      expect(key).toBe('users:user-123:items');
    });

    it('should generate item key', () => {
      const key = service.getItemKey('item-456');
      expect(key).toBe('items:item-456');
    });

    it('should generate user key', () => {
      const key = service.getUserKey('user-789');
      expect(key).toBe('users:user-789');
    });

    it('should generate unread notifications key', () => {
      const key = service.getUnreadNotificationsKey('user-123');
      expect(key).toBe('users:user-123:notifications:unread');
    });

    it('should generate unread messages key', () => {
      const key = service.getUnreadMessagesKey('user-123');
      expect(key).toBe('users:user-123:messages:unread');
    });
  });
});

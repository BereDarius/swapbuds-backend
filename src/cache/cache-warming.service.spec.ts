import { PrismaService } from '@/prisma/prisma.service';
import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CacheWarmingService } from './cache-warming.service';
import { CacheService } from './cache.service';

describe('CacheWarmingService', () => {
  let service: CacheWarmingService;
  let cacheService: CacheService;
  let prisma: PrismaService;

  const mockCacheService = {
    set: jest.fn(),
    getItemsListKey: jest.fn(
      (page, limit) => `items:list:${page}:${limit}:all`,
    ),
    getItemKey: jest.fn((id) => `items:${id}`),
  };

  const mockPrismaService = {
    item: {
      findMany: jest.fn(),
    },
  };

  const mockItems = [
    {
      id: 'item-1',
      title: 'Test Item 1',
      description: 'Description 1',
      condition: 'NEW',
      category: 'ELECTRONICS',
      createdAt: new Date('2025-01-01'),
      updatedAt: new Date('2025-01-01'),
      user: {
        id: 'user-1',
        username: 'testuser',
        avatarUrl: 'avatar.jpg',
      },
      images: [{ url: 'image1.jpg' }],
      _count: {
        likes: 5,
        comments: 3,
      },
    },
    {
      id: 'item-2',
      title: 'Test Item 2',
      description: 'Description 2',
      condition: 'USED',
      category: 'BOOKS',
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
      user: {
        id: 'user-2',
        username: 'testuser2',
        avatarUrl: 'avatar2.jpg',
      },
      images: [{ url: 'image2.jpg' }],
      _count: {
        likes: 10,
        comments: 7,
      },
    },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheWarmingService,
          useFactory: (cache: CacheService, prism: PrismaService) => {
            return new CacheWarmingService(cache, prism, { enabled: true });
          },
          inject: [CacheService, PrismaService],
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CacheWarmingService>(CacheWarmingService);
    cacheService = module.get<CacheService>(CacheService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock logger to suppress console output
    jest.spyOn(Logger.prototype, 'log').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
    jest.spyOn(Logger.prototype, 'error').mockImplementation();

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('onModuleInit', () => {
    it('should warm cache on module initialization', async () => {
      mockPrismaService.item.findMany.mockResolvedValue(mockItems);

      await service.onModuleInit();

      expect(prisma.item.findMany).toHaveBeenCalledTimes(2); // Recent + Popular
      expect(cacheService.set).toHaveBeenCalled();
      expect(Logger.prototype.log).toHaveBeenCalledWith(
        expect.stringContaining('Cache warming completed'),
      );
    });

    it('should skip cache warming when disabled', async () => {
      const disabledService = new CacheWarmingService(cacheService, prisma, {
        enabled: false,
      });

      await disabledService.onModuleInit();

      expect(prisma.item.findMany).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should not throw if cache warming fails', async () => {
      mockPrismaService.item.findMany.mockRejectedValue(new Error('DB error'));

      await expect(service.onModuleInit()).resolves.not.toThrow();
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to warm recent items cache:',
        expect.any(Error),
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(
        'Failed to warm popular items cache:',
        expect.any(Error),
      );
    });
  });

  describe('warmRecentItems', () => {
    it('should cache recent items with correct transformation', async () => {
      mockPrismaService.item.findMany.mockResolvedValueOnce(mockItems);

      await service.onModuleInit();

      expect(prisma.item.findMany).toHaveBeenCalledWith({
        take: 20, // Default itemsCount
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          images: true,
          _count: {
            select: {
              likes: true,
              comments: true,
            },
          },
        },
      });

      expect(cacheService.set).toHaveBeenCalledWith(
        'items:list:0:10:all',
        expect.arrayContaining([
          expect.objectContaining({
            id: 'item-1',
            title: 'Test Item 1',
            owner: expect.objectContaining({
              id: 'user-1',
              username: 'testuser',
            }),
            images: ['image1.jpg'],
            likesCount: 5,
            commentsCount: 3,
          }),
        ]),
        300000, // Default TTL
      );
    });

    it('should respect custom configuration', async () => {
      const customService = new CacheWarmingService(cacheService, prisma, {
        itemsCount: 5,
        ttl: 60000,
      });
      mockPrismaService.item.findMany.mockResolvedValue(mockItems);

      await customService.onModuleInit();

      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        60000,
      );
    });
  });

  describe('warmPopularItems', () => {
    it('should cache popular items individually', async () => {
      mockPrismaService.item.findMany
        .mockResolvedValueOnce(mockItems) // For recent items
        .mockResolvedValueOnce(mockItems); // For popular items

      await service.onModuleInit();

      // Should query popular items
      expect(prisma.item.findMany).toHaveBeenCalledWith({
        take: 10,
        orderBy: [
          { likes: { _count: 'desc' } },
          { comments: { _count: 'desc' } },
        ],
        include: expect.any(Object),
      });

      // Should cache each item individually
      expect(cacheService.set).toHaveBeenCalledWith(
        'items:item-1',
        expect.objectContaining({ id: 'item-1' }),
        300000,
      );
      expect(cacheService.set).toHaveBeenCalledWith(
        'items:item-2',
        expect.objectContaining({ id: 'item-2' }),
        300000,
      );
    });
  });

  describe('warmCache', () => {
    it('should manually trigger cache warming', async () => {
      mockPrismaService.item.findMany.mockResolvedValue(mockItems);

      await service.warmCache();

      expect(prisma.item.findMany).toHaveBeenCalledTimes(2);
      expect(cacheService.set).toHaveBeenCalled();
    });
  });
});

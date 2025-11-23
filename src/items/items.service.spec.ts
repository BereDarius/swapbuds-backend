import { CacheService } from '@/cache/cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockItem, mockItemWithRelations } from '@/test/fixtures/item.fixture';
import { mockCacheService } from '@/test/mocks/cache.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemCategory, ItemCondition } from '@prisma/client';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: typeof mockPrismaService;
  let cacheService: typeof mockCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    prisma = mockPrismaService;
    cacheService = mockCacheService;

    jest.clearAllMocks();
  });

  describe('create', () => {
    const userId = 'user-1';
    const createItemDto = {
      title: 'Test Item',
      description: 'Test description',
      condition: ItemCondition.GOOD,
      category: ItemCategory.ELECTRONICS,
      images: ['https://cloudinary.com/image1.jpg'],
    };

    it('should create an item successfully', async () => {
      prisma.item.create.mockResolvedValue(mockItemWithRelations);

      const result = await service.create(userId, createItemDto);

      expect(prisma.item.create).toHaveBeenCalled();
      expect(result.title).toBe(mockItemWithRelations.title);
    });

    it('should invalidate cache after creating item', async () => {
      prisma.item.create.mockResolvedValue(mockItemWithRelations);

      await service.create(userId, createItemDto);

      // Cache invalidation handled by @CacheInvalidate decorator
      expect(prisma.item.create).toHaveBeenCalled();
    });

    it('should create an item without images', async () => {
      const dtoWithoutImages = {
        title: 'Test Item',
        description: 'Test description',
        condition: ItemCondition.GOOD,
        category: ItemCategory.ELECTRONICS,
      };

      prisma.item.create.mockResolvedValue(mockItemWithRelations);

      const result = await service.create(userId, dtoWithoutImages);

      expect(prisma.item.create).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return cached items when cache hit', async () => {
      const cachedItems = [
        {
          id: mockItemWithRelations.id,
          title: mockItemWithRelations.title,
          description: mockItemWithRelations.description,
          condition: mockItemWithRelations.condition,
          category: mockItemWithRelations.category,
          createdAt: mockItemWithRelations.createdAt,
          updatedAt: mockItemWithRelations.updatedAt,
          owner: {
            id: mockItemWithRelations.user.id,
            username: mockItemWithRelations.user.username,
            avatarUrl: mockItemWithRelations.user.avatarUrl,
          },
          images: mockItemWithRelations.images.map((img) => img.url),
          likesCount: mockItemWithRelations._count.likes,
          commentsCount: mockItemWithRelations._count.comments,
        },
      ];
      cacheService.get.mockResolvedValue(cachedItems);

      const result = await service.findAll(0, 10);

      expect(cacheService.get).toHaveBeenCalledWith('items:list:0:10:all');
      expect(prisma.item.findMany).not.toHaveBeenCalled(); // DB not queried on cache hit
      expect(result).toEqual(cachedItems);
    });

    it('should query database and cache result when cache miss', async () => {
      cacheService.get.mockResolvedValue(null); // Cache miss
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAll(0, 10);

      expect(cacheService.get).toHaveBeenCalledWith('items:list:0:10:all');
      expect(prisma.item.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
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
        expect.any(Array),
        300000, // 5 minutes TTL
      );
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(mockItemWithRelations.title);
    });
  });

  describe('findAllFiltered', () => {
    it('should filter items by status', async () => {
      const filters = { status: 'AVAILABLE' as any, page: 1, limit: 20 };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'AVAILABLE',
          }),
        }),
      );
    });

    it('should filter items by category', async () => {
      const filters = {
        category: ItemCategory.ELECTRONICS,
        page: 1,
        limit: 20,
      };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: ItemCategory.ELECTRONICS,
          }),
        }),
      );
    });

    it('should filter items by condition', async () => {
      const filters = { condition: ItemCondition.NEW, page: 1, limit: 20 };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            condition: ItemCondition.NEW,
          }),
        }),
      );
    });

    it('should search items by title or description', async () => {
      const filters = { search: 'laptop', page: 1, limit: 20 };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should sort items by likes count', async () => {
      const filters = {
        page: 1,
        limit: 20,
        sortBy: 'likes' as any,
        sortOrder: 'desc' as any,
      };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { likes: { _count: 'desc' } },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const filters = { page: 2, limit: 5 };
      prisma.item.count.mockResolvedValue(12);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(12);
      expect(result.totalPages).toBe(3);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should return empty results when no items match filters', async () => {
      const filters = { category: ItemCategory.OTHER, page: 1, limit: 20 };
      prisma.item.count.mockResolvedValue(0);
      prisma.item.findMany.mockResolvedValue([]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });

    it('should filter items by delivery method', async () => {
      const filters = {
        deliveryMethod: 'PHYSICAL' as any,
        page: 1,
        limit: 20,
      };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deliveryMethods: { has: 'PHYSICAL' },
          }),
        }),
      );
    });

    it('should filter items by delivery scope', async () => {
      const filters = {
        deliveryScope: 'NATIONAL' as any,
        page: 1,
        limit: 20,
      };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deliveryScope: 'NATIONAL',
          }),
        }),
      );
    });

    it('should filter items by minimum value', async () => {
      const filters = { minValue: 50, page: 1, limit: 20 };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estimatedValue: { gte: 50 },
          }),
        }),
      );
    });

    it('should filter items by maximum value', async () => {
      const filters = { maxValue: 200, page: 1, limit: 20 };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estimatedValue: { lte: 200 },
          }),
        }),
      );
    });

    it('should filter items by value range', async () => {
      const filters = { minValue: 50, maxValue: 200, page: 1, limit: 20 };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            estimatedValue: { gte: 50, lte: 200 },
          }),
        }),
      );
    });

    it('should combine multiple filters correctly', async () => {
      const filters = {
        category: ItemCategory.ELECTRONICS,
        deliveryMethod: 'MAIL' as any,
        deliveryScope: 'INTERNATIONAL' as any,
        minValue: 100,
        maxValue: 500,
        page: 1,
        limit: 20,
      };
      prisma.item.count.mockResolvedValue(1);
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAllFiltered(filters);

      expect(result.items).toHaveLength(1);
      expect(prisma.item.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            category: ItemCategory.ELECTRONICS,
            deliveryMethods: { has: 'MAIL' },
            deliveryScope: 'INTERNATIONAL',
            estimatedValue: { gte: 100, lte: 500 },
          }),
        }),
      );
    });
  });

  describe('findByUser', () => {
    const userId = 'user-1';

    it('should return cached items when cache hit', async () => {
      const cachedItems = [
        {
          id: mockItemWithRelations.id,
          title: mockItemWithRelations.title,
          description: mockItemWithRelations.description,
          condition: mockItemWithRelations.condition,
          category: mockItemWithRelations.category,
          createdAt: mockItemWithRelations.createdAt,
          updatedAt: mockItemWithRelations.updatedAt,
          owner: {
            id: mockItemWithRelations.user.id,
            username: mockItemWithRelations.user.username,
            avatarUrl: mockItemWithRelations.user.avatarUrl,
          },
          images: mockItemWithRelations.images.map((img) => img.url),
          likesCount: mockItemWithRelations._count.likes,
          commentsCount: mockItemWithRelations._count.comments,
        },
      ];
      cacheService.get.mockResolvedValue(cachedItems);

      const result = await service.findByUser(userId);

      expect(cacheService.get).toHaveBeenCalledWith(`users:${userId}:items`);
      expect(prisma.item.findMany).not.toHaveBeenCalled(); // DB not queried on cache hit
      expect(result).toEqual(cachedItems);
    });

    it('should query database and cache result when cache miss', async () => {
      cacheService.get.mockResolvedValue(null); // Cache miss
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findByUser(userId);

      expect(cacheService.get).toHaveBeenCalledWith(`users:${userId}:items`);
      expect(prisma.item.findMany).toHaveBeenCalledWith({
        where: { userId },
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
        orderBy: { createdAt: 'desc' },
      });
      expect(cacheService.set).toHaveBeenCalledWith(
        `users:${userId}:items`,
        expect.any(Array),
        300000, // 5 minutes
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    const itemId = 'item-1';

    it('should return cached item when cache hit', async () => {
      const cachedItem = {
        id: mockItemWithRelations.id,
        title: mockItemWithRelations.title,
        description: mockItemWithRelations.description,
        condition: mockItemWithRelations.condition,
        category: mockItemWithRelations.category,
        createdAt: mockItemWithRelations.createdAt,
        updatedAt: mockItemWithRelations.updatedAt,
        owner: {
          id: mockItemWithRelations.user.id,
          username: mockItemWithRelations.user.username,
          avatarUrl: mockItemWithRelations.user.avatarUrl,
        },
        images: mockItemWithRelations.images.map((img) => img.url),
        likesCount: mockItemWithRelations._count.likes,
        commentsCount: mockItemWithRelations._count.comments,
      };
      cacheService.get.mockResolvedValue(cachedItem);

      const result = await service.findOne(itemId);

      expect(cacheService.get).toHaveBeenCalledWith(`items:${itemId}`);
      expect(prisma.item.findUnique).not.toHaveBeenCalled(); // DB not queried on cache hit
      expect(result).toEqual(cachedItem);
    });

    it('should query database and cache result when cache miss', async () => {
      cacheService.get.mockResolvedValue(null); // Cache miss
      prisma.item.findUnique.mockResolvedValue(mockItemWithRelations);

      const result = await service.findOne(itemId);

      expect(cacheService.get).toHaveBeenCalledWith(`items:${itemId}`);
      expect(prisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
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
        `items:${itemId}`,
        expect.any(Object),
        300000, // 5 minutes
      );
      expect(result.id).toBe(mockItemWithRelations.id);
    });

    it('should throw NotFoundException if item not found', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(service.findOne(itemId)).rejects.toThrow(NotFoundException);
      await expect(service.findOne(itemId)).rejects.toThrow(
        `Item with ID ${itemId} not found`,
      );
    });
  });

  describe('update', () => {
    const itemId = 'item-1';
    const userId = 'user-1';
    const updateItemDto = {
      title: 'Updated Title',
      description: 'Updated description',
    };

    it('should update an item successfully', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.item.update.mockResolvedValue({
        ...mockItemWithRelations,
        ...updateItemDto,
      });

      const result = await service.update(itemId, userId, updateItemDto);

      // Cache invalidation handled by @CacheInvalidate decorator
      expect(prisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
      });
      expect(prisma.item.update).toHaveBeenCalled();
      expect(result.title).toBe(updateItemDto.title);
    });

    it('should throw NotFoundException if item not found', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(
        service.update(itemId, userId, updateItemDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.item.findUnique.mockResolvedValue({
        ...mockItem,
        userId: 'different-user',
      });

      await expect(
        service.update(itemId, userId, updateItemDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.update(itemId, userId, updateItemDto),
      ).rejects.toThrow('You can only update your own items');
    });

    it('should update an item with images', async () => {
      const updateWithImages = {
        title: 'Updated Title',
        images: [
          'https://cloudinary.com/new1.jpg',
          'https://cloudinary.com/new2.jpg',
        ],
      };

      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.item.update.mockResolvedValue({
        ...mockItemWithRelations,
        ...updateWithImages,
      });

      const result = await service.update(itemId, userId, updateWithImages);

      expect(prisma.item.update).toHaveBeenCalledWith({
        where: { id: itemId },
        data: expect.objectContaining({
          title: updateWithImages.title,
          images: expect.objectContaining({
            deleteMany: {},
            create: expect.any(Array),
          }),
        }),
        include: expect.any(Object),
      });
      expect(result.title).toBe(updateWithImages.title);
    });
  });

  describe('remove', () => {
    const itemId = 'item-1';
    const userId = 'user-1';

    it('should delete an item successfully', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.item.delete.mockResolvedValue(mockItem);

      await service.remove(itemId, userId);

      expect(prisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
      });
      expect(prisma.item.delete).toHaveBeenCalledWith({
        where: { id: itemId },
      });
      // Cache invalidation handled by @CacheInvalidate decorator
    });

    it('should throw NotFoundException if item not found', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(service.remove(itemId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not the owner', async () => {
      prisma.item.findUnique.mockResolvedValue({
        ...mockItem,
        userId: 'different-user',
      });

      await expect(service.remove(itemId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      await expect(service.remove(itemId, userId)).rejects.toThrow(
        'You can only delete your own items',
      );
    });
  });
});

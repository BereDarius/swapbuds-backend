import { PrismaService } from '@/prisma/prisma.service';
import { mockItem, mockItemWithRelations } from '@/test/fixtures/item.fixture';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemCategory, ItemCondition } from './dto/create-item.dto';
import { ItemsService } from './items.service';

describe('ItemsService', () => {
  let service: ItemsService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ItemsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ItemsService>(ItemsService);
    prisma = mockPrismaService;

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
    it('should return array of items', async () => {
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findAll(0, 10);

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
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe(mockItemWithRelations.title);
    });
  });

  describe('findByUser', () => {
    it('should return items for a specific user', async () => {
      const userId = 'user-1';
      prisma.item.findMany.mockResolvedValue([mockItemWithRelations]);

      const result = await service.findByUser(userId);

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
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    const itemId = 'item-1';

    it('should return an item by id', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItemWithRelations);

      const result = await service.findOne(itemId);

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

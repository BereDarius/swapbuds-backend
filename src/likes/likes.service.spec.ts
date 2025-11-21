import { PrismaService } from '@/prisma/prisma.service';
import { mockItem } from '@/test/fixtures/item.fixture';
import { mockLike, mockLikeWithUser } from '@/test/fixtures/like.fixture';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LikesService } from './likes.service';

describe('LikesService', () => {
  let service: LikesService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
    prisma = mockPrismaService;

    jest.clearAllMocks();
  });

  describe('likeItem', () => {
    const userId = 'user-1';
    const itemId = 'item-1';

    it('should like an item successfully', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.like.findUnique.mockResolvedValue(null);
      prisma.like.create.mockResolvedValue(mockLike);

      await service.likeItem(userId, itemId);

      expect(prisma.item.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
      });
      expect(prisma.like.create).toHaveBeenCalledWith({
        data: { userId, itemId },
      });
    });

    it('should throw NotFoundException if item does not exist', async () => {
      prisma.item.findUnique.mockResolvedValue(null);

      await expect(service.likeItem(userId, itemId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.likeItem(userId, itemId)).rejects.toThrow(
        `Item with ID ${itemId} not found`,
      );
    });

    it('should throw ConflictException if item already liked', async () => {
      prisma.item.findUnique.mockResolvedValue(mockItem);
      prisma.like.findUnique.mockResolvedValue(mockLike);

      await expect(service.likeItem(userId, itemId)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.likeItem(userId, itemId)).rejects.toThrow(
        'Item already liked',
      );
    });
  });

  describe('unlikeItem', () => {
    const userId = 'user-1';
    const itemId = 'item-1';

    it('should unlike an item successfully', async () => {
      prisma.like.findUnique.mockResolvedValue(mockLike);
      prisma.like.delete.mockResolvedValue(mockLike);

      await service.unlikeItem(userId, itemId);

      expect(prisma.like.findUnique).toHaveBeenCalledWith({
        where: {
          userId_itemId: { userId, itemId },
        },
      });
      expect(prisma.like.delete).toHaveBeenCalledWith({
        where: { id: mockLike.id },
      });
    });

    it('should throw NotFoundException if like does not exist', async () => {
      prisma.like.findUnique.mockResolvedValue(null);

      await expect(service.unlikeItem(userId, itemId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.unlikeItem(userId, itemId)).rejects.toThrow(
        'Like not found',
      );
    });
  });

  describe('getLikesCount', () => {
    it('should return the count of likes for an item', async () => {
      const itemId = 'item-1';
      prisma.like.count.mockResolvedValue(5);

      const result = await service.getLikesCount(itemId);

      expect(prisma.like.count).toHaveBeenCalledWith({
        where: { itemId },
      });
      expect(result).toBe(5);
    });
  });

  describe('hasUserLikedItem', () => {
    const userId = 'user-1';
    const itemId = 'item-1';

    it('should return true if user has liked the item', async () => {
      prisma.like.findUnique.mockResolvedValue(mockLike);

      const result = await service.hasUserLikedItem(userId, itemId);

      expect(result).toBe(true);
    });

    it('should return false if user has not liked the item', async () => {
      prisma.like.findUnique.mockResolvedValue(null);

      const result = await service.hasUserLikedItem(userId, itemId);

      expect(result).toBe(false);
    });
  });

  describe('getUsersWhoLiked', () => {
    it('should return users who liked an item', async () => {
      const itemId = 'item-1';
      prisma.like.findMany.mockResolvedValue([mockLikeWithUser]);

      const result = await service.getUsersWhoLiked(itemId);

      expect(prisma.like.findMany).toHaveBeenCalledWith({
        where: { itemId },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
      expect(result).toEqual([mockLikeWithUser]);
    });
  });
});

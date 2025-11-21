import { LikesController } from '@/likes/likes.controller';
import { LikesService } from '@/likes/likes.service';
import { mockLikes } from '@/test/fixtures/like.fixture';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('LikesController', () => {
  let controller: LikesController;
  let likesService: LikesService;

  const mockLikesService = {
    likeItem: jest.fn(),
    unlikeItem: jest.fn(),
    getLikesCount: jest.fn(),
    hasUserLikedItem: jest.fn(),
    getUsersWhoLiked: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LikesController],
      providers: [
        {
          provide: LikesService,
          useValue: mockLikesService,
        },
      ],
    }).compile();

    controller = module.get<LikesController>(LikesController);
    likesService = module.get<LikesService>(LikesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('likeItem', () => {
    it('should like an item successfully', async () => {
      const userId = 'user-123';
      const itemId = 'item-456';

      mockLikesService.likeItem.mockResolvedValue(undefined);

      const result = await controller.likeItem(userId, itemId);

      expect(result).toEqual({ message: 'Item liked successfully' });
      expect(likesService.likeItem).toHaveBeenCalledWith(userId, itemId);
      expect(likesService.likeItem).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      const userId = 'user-123';
      const itemId = 'non-existent';

      mockLikesService.likeItem.mockRejectedValue(
        new NotFoundException('Item not found'),
      );

      await expect(controller.likeItem(userId, itemId)).rejects.toThrow(
        NotFoundException,
      );
      expect(likesService.likeItem).toHaveBeenCalledWith(userId, itemId);
    });

    it('should throw ConflictException when already liked', async () => {
      const userId = 'user-123';
      const itemId = 'item-456';

      mockLikesService.likeItem.mockRejectedValue(
        new ConflictException('You have already liked this item'),
      );

      await expect(controller.likeItem(userId, itemId)).rejects.toThrow(
        ConflictException,
      );
      expect(likesService.likeItem).toHaveBeenCalledWith(userId, itemId);
    });
  });

  describe('unlikeItem', () => {
    it('should unlike an item successfully', async () => {
      const userId = 'user-123';
      const itemId = 'item-456';

      mockLikesService.unlikeItem.mockResolvedValue(undefined);

      const result = await controller.unlikeItem(userId, itemId);

      expect(result).toBeUndefined();
      expect(likesService.unlikeItem).toHaveBeenCalledWith(userId, itemId);
      expect(likesService.unlikeItem).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when like not found', async () => {
      const userId = 'user-123';
      const itemId = 'item-456';

      mockLikesService.unlikeItem.mockRejectedValue(
        new NotFoundException('Like not found'),
      );

      await expect(controller.unlikeItem(userId, itemId)).rejects.toThrow(
        NotFoundException,
      );
      expect(likesService.unlikeItem).toHaveBeenCalledWith(userId, itemId);
    });
  });

  describe('getLikesCount', () => {
    it('should return likes count', async () => {
      const itemId = 'item-456';
      const count = 42;

      mockLikesService.getLikesCount.mockResolvedValue(count);

      const result = await controller.getLikesCount(itemId);

      expect(result).toEqual({ count });
      expect(likesService.getLikesCount).toHaveBeenCalledWith(itemId);
      expect(likesService.getLikesCount).toHaveBeenCalledTimes(1);
    });

    it('should return 0 when no likes', async () => {
      const itemId = 'item-456';

      mockLikesService.getLikesCount.mockResolvedValue(0);

      const result = await controller.getLikesCount(itemId);

      expect(result).toEqual({ count: 0 });
      expect(likesService.getLikesCount).toHaveBeenCalledWith(itemId);
    });
  });

  describe('checkUserLiked', () => {
    it('should return true when user liked the item', async () => {
      const userId = 'user-123';
      const itemId = 'item-456';

      mockLikesService.hasUserLikedItem.mockResolvedValue(true);

      const result = await controller.checkUserLiked(userId, itemId);

      expect(result).toEqual({ liked: true });
      expect(likesService.hasUserLikedItem).toHaveBeenCalledWith(
        userId,
        itemId,
      );
      expect(likesService.hasUserLikedItem).toHaveBeenCalledTimes(1);
    });

    it('should return false when user did not like the item', async () => {
      const userId = 'user-123';
      const itemId = 'item-456';

      mockLikesService.hasUserLikedItem.mockResolvedValue(false);

      const result = await controller.checkUserLiked(userId, itemId);

      expect(result).toEqual({ liked: false });
      expect(likesService.hasUserLikedItem).toHaveBeenCalledWith(
        userId,
        itemId,
      );
    });
  });

  describe('getUsersWhoLiked', () => {
    it('should return array of users who liked the item', async () => {
      const itemId = 'item-456';

      mockLikesService.getUsersWhoLiked.mockResolvedValue(mockLikes);

      const result = await controller.getUsersWhoLiked(itemId);

      expect(result).toEqual(mockLikes);
      expect(likesService.getUsersWhoLiked).toHaveBeenCalledWith(itemId);
      expect(likesService.getUsersWhoLiked).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no likes', async () => {
      const itemId = 'item-456';

      mockLikesService.getUsersWhoLiked.mockResolvedValue([]);

      const result = await controller.getUsersWhoLiked(itemId);

      expect(result).toEqual([]);
      expect(likesService.getUsersWhoLiked).toHaveBeenCalledWith(itemId);
    });
  });
});

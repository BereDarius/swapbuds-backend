import { CacheService } from '@/cache/cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { TradeStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service';

// Mock CacheService
const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  delPattern: jest.fn().mockResolvedValue(0),
};

const mockTrade = {
  id: 'trade-123',
  proposerId: 'user-123',
  responderId: 'user-456',
  itemOfferedId: 'item-1',
  itemRequestedId: 'item-2',
  status: TradeStatus.ACCEPTED,
  message: 'Trade message',
  createdAt: new Date(),
  updatedAt: new Date(),
  proposer: {
    id: 'user-123',
    username: 'user1',
    email: 'user1@example.com',
    avatarUrl: null,
  },
  responder: {
    id: 'user-456',
    username: 'user2',
    email: 'user2@example.com',
    avatarUrl: null,
  },
};

const mockReview = {
  id: 'review-123',
  rating: 5,
  comment: 'Great trade!',
  authorId: 'user-123',
  targetId: 'user-456',
  tradeId: 'trade-123',
  createdAt: new Date(),
  updatedAt: new Date(),
  author: {
    id: 'user-123',
    username: 'user1',
    avatarUrl: null,
  },
  target: {
    id: 'user-456',
    username: 'user2',
    avatarUrl: null,
  },
};

const mockReviews = [mockReview];

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
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

    service = module.get<ReviewsService>(ReviewsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createReview', () => {
    const createReviewDto = {
      rating: 5,
      comment: 'Great trade!',
    };

    it('should create a review successfully', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(mockTrade);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);
      mockPrismaService.review.findMany.mockResolvedValue([{ rating: 5 }]);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.createReview(
        'user-123',
        'trade-123',
        createReviewDto,
      );

      expect(result).toEqual(mockReview);
      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'user-123',
            targetId: 'user-456',
            tradeId: 'trade-123',
            rating: 5,
            comment: 'Great trade!',
          }),
        }),
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: { reputationScore: 5 },
      });
    });

    it('should throw NotFoundException when trade not found', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(null);

      await expect(
        service.createReview('user-123', 'trade-123', createReviewDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when trade is not accepted', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue({
        ...mockTrade,
        status: TradeStatus.PENDING,
      });

      await expect(
        service.createReview('user-123', 'trade-123', createReviewDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not part of trade', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(mockTrade);

      await expect(
        service.createReview('user-789', 'trade-123', createReviewDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when review already exists', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(mockTrade);
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.createReview('user-123', 'trade-123', createReviewDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should correctly determine target user when proposer reviews', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(mockTrade);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);
      mockPrismaService.review.findMany.mockResolvedValue([{ rating: 5 }]);
      mockPrismaService.user.update.mockResolvedValue({});

      await service.createReview('user-123', 'trade-123', createReviewDto);

      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'user-123',
            targetId: 'user-456', // Responder
          }),
        }),
      );
    });

    it('should correctly determine target user when responder reviews', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(mockTrade);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue({
        ...mockReview,
        authorId: 'user-456',
        targetId: 'user-123',
      });
      mockPrismaService.review.findMany.mockResolvedValue([{ rating: 5 }]);
      mockPrismaService.user.update.mockResolvedValue({});

      await service.createReview('user-456', 'trade-123', createReviewDto);

      expect(prisma.review.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'user-456',
            targetId: 'user-123', // Proposer
          }),
        }),
      );
    });
  });

  describe('getUserReviews', () => {
    it('should return all reviews for a user', async () => {
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.getUserReviews('user-456');

      expect(result).toEqual(mockReviews);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { targetId: 'user-456' },
        }),
      );
    });

    it('should return empty array when user has no reviews', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);

      const result = await service.getUserReviews('user-456');

      expect(result).toEqual([]);
    });
  });

  describe('getUserReviewsGiven', () => {
    it('should return all reviews given by a user', async () => {
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.getUserReviewsGiven('user-123');

      expect(result).toEqual(mockReviews);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { authorId: 'user-123' },
        }),
      );
    });
  });

  describe('getReviewById', () => {
    it('should return a review by ID', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      const result = await service.getReviewById('review-123');

      expect(result).toEqual(mockReview);
      expect(prisma.review.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'review-123' },
        }),
      );
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(service.getReviewById('review-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateReview', () => {
    const updateReviewDto = {
      rating: 4,
      comment: 'Updated comment',
    };

    it('should update a review successfully', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        ...updateReviewDto,
      });
      mockPrismaService.review.findMany.mockResolvedValue([{ rating: 4 }]);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.updateReview(
        'user-123',
        'review-123',
        updateReviewDto,
      );

      expect(result.rating).toBe(4);
      expect(result.comment).toBe('Updated comment');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: { reputationScore: 4 },
      });
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        service.updateReview('user-123', 'review-123', updateReviewDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.updateReview('user-789', 'review-123', updateReviewDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should not update reputation if rating not changed', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.update.mockResolvedValue({
        ...mockReview,
        comment: 'Updated comment only',
      });

      await service.updateReview('user-123', 'review-123', {
        comment: 'Updated comment only',
      });

      expect(prisma.user.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteReview', () => {
    it('should delete a review successfully', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.delete.mockResolvedValue(mockReview);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.user.update.mockResolvedValue({});

      await service.deleteReview('user-123', 'review-123');

      expect(prisma.review.delete).toHaveBeenCalledWith({
        where: { id: 'review-123' },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: { reputationScore: 0 },
      });
    });

    it('should throw NotFoundException when review not found', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteReview('user-123', 'review-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user is not the author', async () => {
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);

      await expect(
        service.deleteReview('user-789', 'review-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getTradeReviews', () => {
    it('should return all reviews for a trade', async () => {
      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const result = await service.getTradeReviews('trade-123');

      expect(result).toEqual(mockReviews);
      expect(prisma.review.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tradeId: 'trade-123' },
        }),
      );
    });
  });

  describe('updateUserReputation', () => {
    it('should calculate average rating and update reputation', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
        { rating: 5 },
      ]);
      mockPrismaService.user.update.mockResolvedValue({});

      // Call via createReview to test private method
      mockPrismaService.trade.findUnique.mockResolvedValue(mockTrade);
      mockPrismaService.review.findUnique.mockResolvedValue(null);
      mockPrismaService.review.create.mockResolvedValue(mockReview);

      await service.createReview('user-123', 'trade-123', {
        rating: 5,
        comment: 'Great!',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: { reputationScore: expect.any(Number) },
      });
    });

    it('should set reputation to 0 when user has no reviews', async () => {
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.user.update.mockResolvedValue({});

      // Call via deleteReview to test private method
      mockPrismaService.review.findUnique.mockResolvedValue(mockReview);
      mockPrismaService.review.delete.mockResolvedValue(mockReview);

      await service.deleteReview('user-123', 'review-123');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-456' },
        data: { reputationScore: 0 },
      });
    });
  });
});

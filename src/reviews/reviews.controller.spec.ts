import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { mockReviewsService } from '@/test/mocks/reviews.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

describe('ReviewsController', () => {
  let controller: ReviewsController;
  let service: ReviewsService;

  const mockReview = {
    id: 'review-123',
    tradeId: 'trade-123',
    authorId: 'user-123',
    targetId: 'user-456',
    rating: 5,
    comment: 'Great trade!',
    author: {
      id: 'user-123',
      username: 'testuser',
      avatarUrl: null,
    },
    target: {
      id: 'user-456',
      username: 'targetuser',
      avatarUrl: null,
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReviewsController],
      providers: [
        {
          provide: ReviewsService,
          useValue: mockReviewsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<ReviewsController>(ReviewsController);
    service = module.get<ReviewsService>(ReviewsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createReview', () => {
    it('should create a review for a trade', async () => {
      const userId = 'user-123';
      const tradeId = 'trade-123';
      const createReviewDto: CreateReviewDto = {
        rating: 5,
        comment: 'Great trade!',
      };

      mockReviewsService.createReview.mockResolvedValue(mockReview);

      const result = await controller.createReview(
        userId,
        tradeId,
        createReviewDto,
      );

      expect(result).toEqual(mockReview);
      expect(service.createReview).toHaveBeenCalledWith(
        userId,
        tradeId,
        createReviewDto,
      );
      expect(service.createReview).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUserReviews', () => {
    it('should return reviews received by a user', async () => {
      const userId = 'user-456';
      const reviews = [mockReview];

      mockReviewsService.getUserReviews.mockResolvedValue(reviews);

      const result = await controller.getUserReviews(userId);

      expect(result).toEqual(reviews);
      expect(service.getUserReviews).toHaveBeenCalledWith(userId);
      expect(service.getUserReviews).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMyReviewsGiven', () => {
    it('should return reviews given by the current user', async () => {
      const userId = 'user-123';
      const reviews = [mockReview];

      mockReviewsService.getUserReviewsGiven.mockResolvedValue(reviews);

      const result = await controller.getMyReviewsGiven(userId);

      expect(result).toEqual(reviews);
      expect(service.getUserReviewsGiven).toHaveBeenCalledWith(userId);
      expect(service.getUserReviewsGiven).toHaveBeenCalledTimes(1);
    });
  });

  describe('getMyReviews', () => {
    it('should return reviews received by the current user', async () => {
      const userId = 'user-123';
      const reviews = [mockReview];

      mockReviewsService.getUserReviews.mockResolvedValue(reviews);

      const result = await controller.getMyReviews(userId);

      expect(result).toEqual(reviews);
      expect(service.getUserReviews).toHaveBeenCalledWith(userId);
      expect(service.getUserReviews).toHaveBeenCalledTimes(1);
    });
  });

  describe('getReviewById', () => {
    it('should return a specific review by ID', async () => {
      const reviewId = 'review-123';

      mockReviewsService.getReviewById.mockResolvedValue(mockReview);

      const result = await controller.getReviewById(reviewId);

      expect(result).toEqual(mockReview);
      expect(service.getReviewById).toHaveBeenCalledWith(reviewId);
      expect(service.getReviewById).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateReview', () => {
    it('should update a review', async () => {
      const userId = 'user-123';
      const reviewId = 'review-123';
      const updateReviewDto: UpdateReviewDto = {
        rating: 4,
        comment: 'Updated comment',
      };

      const updatedReview = {
        ...mockReview,
        rating: 4,
        comment: 'Updated comment',
      };

      mockReviewsService.updateReview.mockResolvedValue(updatedReview);

      const result = await controller.updateReview(
        userId,
        reviewId,
        updateReviewDto,
      );

      expect(result).toEqual(updatedReview);
      expect(service.updateReview).toHaveBeenCalledWith(
        userId,
        reviewId,
        updateReviewDto,
      );
      expect(service.updateReview).toHaveBeenCalledTimes(1);
    });
  });

  describe('deleteReview', () => {
    it('should delete a review', async () => {
      const userId = 'user-123';
      const reviewId = 'review-123';

      mockReviewsService.deleteReview.mockResolvedValue(undefined);

      const result = await controller.deleteReview(userId, reviewId);

      expect(result).toBeUndefined();
      expect(service.deleteReview).toHaveBeenCalledWith(userId, reviewId);
      expect(service.deleteReview).toHaveBeenCalledTimes(1);
    });
  });

  describe('getTradeReviews', () => {
    it('should return all reviews for a specific trade', async () => {
      const tradeId = 'trade-123';
      const reviews = [mockReview];

      mockReviewsService.getTradeReviews.mockResolvedValue(reviews);

      const result = await controller.getTradeReviews(tradeId);

      expect(result).toEqual(reviews);
      expect(service.getTradeReviews).toHaveBeenCalledWith(tradeId);
      expect(service.getTradeReviews).toHaveBeenCalledTimes(1);
    });
  });
});

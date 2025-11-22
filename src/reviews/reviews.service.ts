import { Cacheable, CacheInvalidate } from '@/cache/cache.module';
import { CacheService } from '@/cache/cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TradeStatus } from '@prisma/client';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  cacheService: CacheService;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a review for a completed trade
   */
  @CacheInvalidate((userId: string, tradeId: string) => [
    `users:${userId}:reviews:*`,
    `reviews:*`,
    `trades:${tradeId}`,
  ])
  async createReview(
    userId: string,
    tradeId: string,
    createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    // Check if trade exists and is completed
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposer: true,
        responder: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.status !== TradeStatus.ACCEPTED) {
      throw new BadRequestException(
        'Reviews can only be created for accepted trades',
      );
    }

    // Check if user is part of the trade
    if (trade.proposerId !== userId && trade.responderId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    // Determine the target user (the other person in the trade)
    const targetId =
      trade.proposerId === userId ? trade.responderId : trade.proposerId;

    // Check if user already reviewed this trade
    const existingReview = await this.prisma.review.findUnique({
      where: {
        authorId_tradeId: {
          authorId: userId,
          tradeId,
        },
      },
    });

    if (existingReview) {
      throw new BadRequestException('You have already reviewed this trade');
    }

    // Create the review
    const review = await this.prisma.review.create({
      data: {
        authorId: userId,
        targetId,
        tradeId,
        rating: createReviewDto.rating,
        comment: createReviewDto.comment,
      },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update target user's reputation score
    await this.updateUserReputation(targetId);

    return review;
  }

  /**
   * Get reviews for a specific user (as target)
   */
  @Cacheable({
    ttl: 120000, // 2 minutes
    keyGenerator: (userId: string) => `users:${userId}:reviews:received`,
  })
  async getUserReviews(userId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { targetId: userId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }

  /**
   * Get reviews given by a user
   */
  @Cacheable({
    ttl: 120000, // 2 minutes
    keyGenerator: (userId: string) => `users:${userId}:reviews:given`,
  })
  async getUserReviewsGiven(userId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { authorId: userId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return reviews;
  }

  /**
   * Get a specific review by ID
   */
  @Cacheable({
    ttl: 120000, // 2 minutes
    keyGenerator: (reviewId: string) => `reviews:${reviewId}`,
  })
  async getReviewById(reviewId: string): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  /**
   * Update a review (only by the author)
   */
  @CacheInvalidate((userId: string, reviewId: string) => [
    `users:${userId}:reviews:*`,
    `reviews:${reviewId}`,
    `reviews:*`,
  ])
  async updateReview(
    userId: string,
    reviewId: string,
    updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.authorId !== userId) {
      throw new ForbiddenException('You can only update your own reviews');
    }

    const updatedReview = await this.prisma.review.update({
      where: { id: reviewId },
      data: updateReviewDto,
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update target user's reputation score if rating changed
    if (updateReviewDto.rating !== undefined) {
      await this.updateUserReputation(review.targetId);
    }

    return updatedReview;
  }

  /**
   * Delete a review (only by the author)
   */
  @CacheInvalidate((userId: string, reviewId: string) => [
    `users:${userId}:reviews:*`,
    `reviews:${reviewId}`,
    `reviews:*`,
  ])
  async deleteReview(userId: string, reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.authorId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    const targetId = review.targetId;

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    // Update target user's reputation score
    await this.updateUserReputation(targetId);
  }

  /**
   * Get reviews for a specific trade
   */
  @Cacheable({
    ttl: 120000, // 2 minutes
    keyGenerator: (tradeId: string) => `trades:${tradeId}:reviews`,
  })
  async getTradeReviews(tradeId: string): Promise<ReviewResponseDto[]> {
    const reviews = await this.prisma.review.findMany({
      where: { tradeId },
      include: {
        author: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        target: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return reviews;
  }

  /**
   * Calculate and update user's reputation score based on reviews
   */
  private async updateUserReputation(userId: string): Promise<void> {
    const reviews = await this.prisma.review.findMany({
      where: { targetId: userId },
      select: { rating: true },
    });

    if (reviews.length === 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { reputationScore: 0 },
      });
      return;
    }

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;

    await this.prisma.user.update({
      where: { id: userId },
      data: { reputationScore: averageRating },
    });
  }
}

import { CurrentUser } from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CreateReviewDto } from './dto/create-review.dto';
import { ReviewResponseDto } from './dto/review-response.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * Create a review for a completed trade
   * POST /reviews/trades/:tradeId
   */
  @Post('trades/:tradeId')
  async createReview(
    @CurrentUser('sub') userId: string,
    @Param('tradeId') tradeId: string,
    @Body() createReviewDto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.createReview(userId, tradeId, createReviewDto);
  }

  /**
   * Get reviews received by a user
   * GET /reviews/users/:userId
   */
  @Get('users/:userId')
  async getUserReviews(
    @Param('userId') userId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.getUserReviews(userId);
  }

  /**
   * Get reviews given by the current user
   * GET /reviews/me/given
   */
  @Get('me/given')
  async getMyReviewsGiven(
    @CurrentUser('sub') userId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.getUserReviewsGiven(userId);
  }

  /**
   * Get reviews received by the current user
   * GET /reviews/me
   */
  @Get('me')
  async getMyReviews(
    @CurrentUser('sub') userId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.getUserReviews(userId);
  }

  /**
   * Get a specific review by ID
   * GET /reviews/:id
   */
  @Get(':id')
  async getReviewById(@Param('id') id: string): Promise<ReviewResponseDto> {
    return this.reviewsService.getReviewById(id);
  }

  /**
   * Update a review
   * PUT /reviews/:id
   */
  @Put(':id')
  async updateReview(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.updateReview(userId, id, updateReviewDto);
  }

  /**
   * Delete a review
   * DELETE /reviews/:id
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteReview(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ): Promise<void> {
    return this.reviewsService.deleteReview(userId, id);
  }

  /**
   * Get reviews for a specific trade
   * GET /reviews/trades/:tradeId/all
   */
  @Get('trades/:tradeId/all')
  async getTradeReviews(
    @Param('tradeId') tradeId: string,
  ): Promise<ReviewResponseDto[]> {
    return this.reviewsService.getTradeReviews(tradeId);
  }
}

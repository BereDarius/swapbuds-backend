import { CurrentUser } from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LikesService } from './likes.service';

/**
 * Controller for managing item likes
 * All endpoints require authentication
 */
@ApiTags('Likes')
@Controller('items')
@UseGuards(JwtAuthGuard)
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  /**
   * Like an item
   */
  @Post(':itemId/like')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Like an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({
    status: 201,
    description: 'Item liked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Item not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Item already liked',
  })
  async likeItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.likesService.likeItem(userId, itemId);
    return { message: 'Item liked successfully' };
  }

  /**
   * Unlike an item
   */
  @Delete(':itemId/like')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unlike an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({
    status: 204,
    description: 'Item unliked successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Like not found',
  })
  async unlikeItem(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
  ) {
    await this.likesService.unlikeItem(userId, itemId);
  }

  /**
   * Get likes count for an item
   */
  @Get(':itemId/likes/count')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get likes count for an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Likes count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 42 },
      },
    },
  })
  async getLikesCount(@Param('itemId') itemId: string) {
    const count = await this.likesService.getLikesCount(itemId);
    return { count };
  }

  /**
   * Check if current user liked an item
   */
  @Get(':itemId/likes/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if current user liked an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Like status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        liked: { type: 'boolean', example: true },
      },
    },
  })
  async checkUserLiked(
    @CurrentUser('sub') userId: string,
    @Param('itemId') itemId: string,
  ) {
    const liked = await this.likesService.hasUserLikedItem(userId, itemId);
    return { liked };
  }

  /**
   * Get users who liked an item
   */
  @Get(':itemId/likes/users')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get users who liked an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' },
          user: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              username: { type: 'string' },
              avatarUrl: { type: 'string', nullable: true },
            },
          },
        },
      },
    },
  })
  async getUsersWhoLiked(@Param('itemId') itemId: string) {
    return this.likesService.getUsersWhoLiked(itemId);
  }
}

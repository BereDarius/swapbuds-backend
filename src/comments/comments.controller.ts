import {
  CurrentUser,
  Public,
  RequireVerified,
} from '@/auth/decorators/auth.decorators';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { VerifiedGuard } from '@/auth/guards/verified.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CommentDto } from './dto/comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

/**
 * Controller for managing item comments
 * Read operations are public, write operations require authentication
 */
@ApiTags('Comments')
@Controller('items')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * Create a comment on an item
   * Requires authentication and verification
   */
  @Post(':itemId/comments')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a comment on an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiBody({ type: CreateCommentDto })
  @ApiResponse({
    status: 201,
    description: 'Comment created successfully',
    type: CommentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Item not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Verification required',
  })
  async createComment(
    @CurrentUser('id') userId: string,
    @Param('itemId') itemId: string,
    @Body() createCommentDto: CreateCommentDto,
  ): Promise<CommentDto> {
    return this.commentsService.createComment(userId, itemId, createCommentDto);
  }

  /**
   * Get all comments for an item with nested replies
   */
  @Get(':itemId/comments')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all comments for an item with nested replies' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Comments retrieved successfully',
    type: [CommentDto],
  })
  async getItemComments(
    @Param('itemId') itemId: string,
    @CurrentUser('id') currentUserId?: string,
  ): Promise<CommentDto[]> {
    return this.commentsService.getItemComments(itemId, currentUserId);
  }

  /**
   * Update a comment
   */
  @Patch('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiBody({ type: UpdateCommentDto })
  @ApiResponse({
    status: 200,
    description: 'Comment updated successfully',
    type: CommentDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not comment owner',
  })
  async updateComment(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
  ): Promise<CommentDto> {
    return this.commentsService.updateComment(
      commentId,
      userId,
      updateCommentDto,
    );
  }

  /**
   * Delete a comment
   */
  @Delete('comments/:commentId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment deleted successfully',
    schema: {
      type: 'object',
      properties: {
        commentsCount: { type: 'number', example: 5 },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - not comment owner',
  })
  async deleteComment(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentsService.deleteComment(commentId, userId);
  }

  /**
   * Get comment count for an item
   */
  @Get(':itemId/comments/count')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comment count for an item' })
  @ApiParam({ name: 'itemId', description: 'Item ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment count retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        count: { type: 'number', example: 15 },
      },
    },
  })
  async getCommentsCount(@Param('itemId') itemId: string) {
    const count = await this.commentsService.getCommentsCount(itemId);
    return { count };
  }

  /**
   * Like a comment
   */
  @Post('comments/:commentId/like')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Like a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 201,
    description: 'Comment liked successfully',
  })
  async likeComment(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
  ) {
    const { count, hasLiked } = await this.commentsService.likeComment(
      userId,
      commentId,
    );
    return {
      message: 'Comment liked successfully',
      likesCount: count,
      hasLiked,
    };
  }

  /**
   * Unlike a comment
   */
  @Delete('comments/:commentId/like')
  @UseGuards(VerifiedGuard)
  @RequireVerified()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unlike a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Comment unliked successfully',
  })
  async unlikeComment(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
  ) {
    const { count, hasLiked } = await this.commentsService.unlikeComment(
      userId,
      commentId,
    );
    return { likesCount: count, hasLiked };
  }

  /**
   * Check if user has liked a comment
   */
  @Get('comments/:commentId/liked')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if user has liked a comment' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Like status retrieved',
  })
  async hasLikedComment(
    @CurrentUser('id') userId: string,
    @Param('commentId') commentId: string,
  ) {
    return this.commentsService.hasLikedComment(userId, commentId);
  }

  /**
   * Get comment version history (admin/moderator only)
   */
  @Get('comments/:commentId/versions')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get comment edit history (admin/moderator only)' })
  @ApiParam({ name: 'commentId', description: 'Comment ID' })
  @ApiResponse({
    status: 200,
    description: 'Version history retrieved',
  })
  async getCommentVersions(@Param('commentId') commentId: string) {
    return this.commentsService.getCommentVersions(commentId);
  }
}

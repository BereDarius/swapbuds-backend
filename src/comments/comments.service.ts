import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentDto } from './dto/comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

/**
 * Service for managing item comments
 * Handles CRUD operations with ownership validation
 */
@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a comment on an item
   * @param userId - User ID
   * @param itemId - Item ID
   * @param createCommentDto - Comment data
   * @returns Created comment with user info
   */
  async createComment(
    userId: string,
    itemId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentDto> {
    // Check if item exists
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        userId,
        itemId,
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: comment.id,
      content: comment.content,
      itemId: comment.itemId,
      userId: comment.userId,
      username: comment.user.username,
      avatarUrl: comment.user.avatarUrl,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  /**
   * Get all comments for an item
   * @param itemId - Item ID
   * @returns Array of comments with user info
   */
  async getItemComments(itemId: string): Promise<CommentDto[]> {
    const comments = await this.prisma.comment.findMany({
      where: { itemId },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      itemId: comment.itemId,
      userId: comment.userId,
      username: comment.user.username,
      avatarUrl: comment.user.avatarUrl,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    }));
  }

  /**
   * Update a comment
   * @param commentId - Comment ID
   * @param userId - User ID
   * @param updateCommentDto - Updated comment data
   * @returns Updated comment
   */
  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<CommentDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: updateCommentDto.content,
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    return {
      id: updatedComment.id,
      content: updatedComment.content,
      itemId: updatedComment.itemId,
      userId: updatedComment.userId,
      username: updatedComment.user.username,
      avatarUrl: updatedComment.user.avatarUrl,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
    };
  }

  /**
   * Delete a comment
   * @param commentId - Comment ID
   * @param userId - User ID
   */
  async deleteComment(commentId: string, userId: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({
      where: { id: commentId },
    });
  }

  /**
   * Get comment count for an item
   * @param itemId - Item ID
   * @returns Number of comments
   */
  async getCommentsCount(itemId: string): Promise<number> {
    return this.prisma.comment.count({
      where: { itemId },
    });
  }
}

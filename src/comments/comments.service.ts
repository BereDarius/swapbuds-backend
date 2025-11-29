import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommentDto, CommentVersionDto } from './dto/comment.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

/**
 * Service for managing item comments
 * Handles CRUD operations, version history, likes, and moderation
 */
@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a comment on an item
   * @param userId - User ID
   * @param itemId - Item ID
   * @param createCommentDto - Comment data
   * @returns Created comment with user info and updated count
   */
  async createComment(
    userId: string,
    itemId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentDto & { commentsCount: number }> {
    // Check if item exists
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    // Validate parentId if provided (for replies)
    if (createCommentDto.parentId) {
      const parentComment = await this.prisma.comment.findUnique({
        where: { id: createCommentDto.parentId },
      });

      if (!parentComment) {
        throw new NotFoundException(
          `Parent comment with ID ${createCommentDto.parentId} not found`,
        );
      }

      if (parentComment.itemId !== itemId) {
        throw new BadRequestException(
          'Parent comment does not belong to this item',
        );
      }
    }

    const comment = await this.prisma.comment.create({
      data: {
        content: createCommentDto.content,
        userId,
        itemId,
        parentId: createCommentDto.parentId || null,
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
      },
    });

    // Get updated comment count (only top-level comments)
    const commentsCount = await this.prisma.comment.count({
      where: { itemId, parentId: null, isDeleted: false },
    });

    // Get likes count
    const likesCount = await this.prisma.commentLike.count({
      where: { commentId: comment.id },
    });

    return {
      id: comment.id,
      content: comment.content,
      itemId: comment.itemId,
      userId: comment.userId,
      username: comment.user.username,
      avatarUrl: comment.user.avatarUrl,
      isVerified: comment.user.isVerified,
      parentId: comment.parentId,
      isEdited: comment.isEdited,
      editedAt: comment.editedAt,
      isDeleted: comment.isDeleted,
      deletedAt: comment.deletedAt,
      deletedBy: comment.deletedBy,
      deleteReason: comment.deleteReason,
      likesCount,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
      commentsCount,
    };
  }

  /**
   * Get all comments for an item with nested replies
   * @param itemId - Item ID
   * @param currentUserId - Optional current user ID to check if they liked comments
   * @returns Array of top-level comments with nested replies
   */
  async getItemComments(
    itemId: string,
    currentUserId?: string,
  ): Promise<CommentDto[]> {
    // Get all comments (both top-level and replies)
    const allComments = await this.prisma.comment.findMany({
      where: { itemId },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first for proper nesting
    });

    // Get current user's likes if authenticated
    let userLikes: Set<string> = new Set();
    if (currentUserId) {
      const likes = await this.prisma.commentLike.findMany({
        where: {
          userId: currentUserId,
          commentId: { in: allComments.map((c) => c.id) },
        },
        select: { commentId: true },
      });
      userLikes = new Set(likes.map((l) => l.commentId));
    }

    // Map comments to DTOs
    const commentMap = new Map<string, CommentDto>();
    const topLevelComments: CommentDto[] = [];

    allComments.forEach((comment) => {
      const commentDto: CommentDto = {
        id: comment.id,
        content: comment.isDeleted ? '[deleted]' : comment.content,
        itemId: comment.itemId,
        userId: comment.userId,
        username: comment.user.username,
        avatarUrl: comment.user.avatarUrl,
        isVerified: comment.user.isVerified,
        parentId: comment.parentId,
        isEdited: comment.isEdited,
        editedAt: comment.editedAt,
        isDeleted: comment.isDeleted,
        deletedAt: comment.deletedAt,
        deletedBy: comment.deletedBy,
        deleteReason: comment.deleteReason,
        likesCount: comment._count.likes,
        hasLiked: currentUserId ? userLikes.has(comment.id) : undefined,
        replies: [],
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
      };

      commentMap.set(comment.id, commentDto);

      if (!comment.parentId) {
        topLevelComments.push(commentDto);
      }
    });

    // Build nested structure
    allComments.forEach((comment) => {
      if (comment.parentId) {
        const parent = commentMap.get(comment.parentId);
        const child = commentMap.get(comment.id);
        if (parent && child) {
          parent.replies!.push(child);
        }
      }
    });

    // Return only top-level comments (replies are nested)
    return topLevelComments.reverse(); // Newest first for display
  }

  /**
   * Update a comment (saves version history)
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
            isVerified: true,
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

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot edit a deleted comment');
    }

    // Save version history before updating
    await this.prisma.commentVersion.create({
      data: {
        commentId: comment.id,
        content: comment.content, // Save previous content
        editedBy: userId,
      },
    });

    const updatedComment = await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        content: updateCommentDto.content,
        isEdited: true,
        editedAt: new Date(),
      },
      include: {
        user: {
          select: {
            username: true,
            avatarUrl: true,
            isVerified: true,
          },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
    });

    // Check if current user liked this comment
    const hasLiked = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId: updatedComment.id,
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
      isVerified: updatedComment.user.isVerified,
      parentId: updatedComment.parentId,
      isEdited: updatedComment.isEdited,
      editedAt: updatedComment.editedAt,
      isDeleted: updatedComment.isDeleted,
      deletedAt: updatedComment.deletedAt,
      deletedBy: updatedComment.deletedBy,
      deleteReason: updatedComment.deleteReason,
      likesCount: updatedComment._count.likes,
      hasLiked: !!hasLiked,
      createdAt: updatedComment.createdAt,
      updatedAt: updatedComment.updatedAt,
    };
  }

  /**
   * Soft delete a comment (user)
   * @param commentId - Comment ID
   * @param userId - User ID
   * @returns Updated comment count for the item
   */
  async deleteComment(
    commentId: string,
    userId: string,
  ): Promise<{ commentsCount: number }> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Comment already deleted');
    }

    const itemId = comment.itemId;

    // Soft delete
    await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: userId,
      },
    });

    // Get updated comment count (exclude deleted)
    const commentsCount = await this.prisma.comment.count({
      where: { itemId, parentId: null, isDeleted: false },
    });

    return { commentsCount };
  }

  /**
   * Moderator delete comment with reason
   * @param commentId - Comment ID
   * @param moderatorId - Moderator user ID
   * @param reason - Reason for deletion
   */
  async moderatorDeleteComment(
    commentId: string,
    moderatorId: string,
    reason: string,
  ): Promise<void> {
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    await this.prisma.comment.update({
      where: { id: commentId },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: moderatorId,
        deleteReason: reason,
      },
    });
  }

  /**
   * Get comment count for an item (excludes deleted, only top-level)
   * @param itemId - Item ID
   * @returns Number of comments
   */
  async getCommentsCount(itemId: string): Promise<number> {
    return this.prisma.comment.count({
      where: { itemId, parentId: null, isDeleted: false },
    });
  }

  /**
   * Like a comment
   * @param userId - User ID
   * @param commentId - Comment ID
   * @returns Updated likes count and hasLiked status
   */
  async likeComment(
    userId: string,
    commentId: string,
  ): Promise<{ count: number; hasLiked: boolean }> {
    // Check if comment exists
    const comment = await this.prisma.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.isDeleted) {
      throw new BadRequestException('Cannot like a deleted comment');
    }

    // Check if already liked
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (existingLike) {
      throw new BadRequestException('Comment already liked');
    }

    // Create like
    await this.prisma.commentLike.create({
      data: {
        userId,
        commentId,
      },
    });

    // Return updated count
    const count = await this.prisma.commentLike.count({
      where: { commentId },
    });

    return { count, hasLiked: true };
  }

  /**
   * Unlike a comment
   * @param userId - User ID
   * @param commentId - Comment ID
   * @returns Updated likes count and hasLiked status
   */
  async unlikeComment(
    userId: string,
    commentId: string,
  ): Promise<{ count: number; hasLiked: boolean }> {
    // Check if like exists
    const existingLike = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    if (!existingLike) {
      throw new NotFoundException('Like not found');
    }

    // Delete like
    await this.prisma.commentLike.delete({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    // Return updated count
    const count = await this.prisma.commentLike.count({
      where: { commentId },
    });

    return { count, hasLiked: false };
  }

  /**
   * Check if user has liked a comment
   * @param userId - User ID
   * @param commentId - Comment ID
   * @returns Whether user has liked the comment
   */
  async hasLikedComment(
    userId: string,
    commentId: string,
  ): Promise<{ hasLiked: boolean }> {
    const like = await this.prisma.commentLike.findUnique({
      where: {
        userId_commentId: {
          userId,
          commentId,
        },
      },
    });

    return { hasLiked: !!like };
  }

  /**
   * Get comment version history (admin/moderator only)
   * @param commentId - Comment ID
   * @returns Array of comment versions
   */
  async getCommentVersions(commentId: string): Promise<CommentVersionDto[]> {
    const versions = await this.prisma.commentVersion.findMany({
      where: { commentId },
      orderBy: { createdAt: 'desc' },
    });

    return versions.map((v) => ({
      id: v.id,
      content: v.content,
      editedBy: v.editedBy,
      createdAt: v.createdAt,
    }));
  }
}

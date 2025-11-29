import { PrismaService } from '@/prisma/prisma.service';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

/**
 * Service for managing item likes
 * Handles like/unlike operations and like counts
 */
@Injectable()
export class LikesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Like an item
   * @param userId - User ID
   * @param itemId - Item ID
   * @returns Updated like count
   * @throws NotFoundException if item doesn't exist
   * @throws ConflictException if already liked
   */
  async likeItem(userId: string, itemId: string): Promise<{ count: number }> {
    // Check if item exists
    const item = await this.prisma.item.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Item with ID ${itemId} not found`);
    }

    // Check if already liked
    const existingLike = await this.prisma.like.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (existingLike) {
      throw new ConflictException('Item already liked');
    }

    // Create like
    await this.prisma.like.create({
      data: {
        userId,
        itemId,
      },
    });

    // Return updated count
    const count = await this.prisma.like.count({
      where: { itemId },
    });

    return { count };
  }

  /**
   * Unlike an item
   * @param userId - User ID
   * @param itemId - Item ID
   * @returns Updated like count
   * @throws NotFoundException if like doesn't exist
   */
  async unlikeItem(userId: string, itemId: string): Promise<{ count: number }> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    if (!like) {
      throw new NotFoundException('Like not found');
    }

    const itemId_forCount = like.itemId;

    await this.prisma.like.delete({
      where: {
        id: like.id,
      },
    });

    // Return updated count
    const count = await this.prisma.like.count({
      where: { itemId: itemId_forCount },
    });

    return { count };
  }

  /**
   * Get like count for an item
   * @param itemId - Item ID
   * @returns Number of likes
   */
  async getLikesCount(itemId: string): Promise<number> {
    return this.prisma.like.count({
      where: { itemId },
    });
  }

  /**
   * Check if user has liked an item
   * @param userId - User ID
   * @param itemId - Item ID
   * @returns True if liked
   */
  async hasUserLikedItem(userId: string, itemId: string): Promise<boolean> {
    const like = await this.prisma.like.findUnique({
      where: {
        userId_itemId: {
          userId,
          itemId,
        },
      },
    });

    return !!like;
  }

  /**
   * Get users who liked an item
   * @param itemId - Item ID
   * @returns Array of user info
   */
  async getUsersWhoLiked(itemId: string) {
    return this.prisma.like.findMany({
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
  }
}

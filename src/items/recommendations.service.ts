import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { ItemCategory, ItemStatus } from '@prisma/client';

/**
 * Service for generating personalized item recommendations
 * Uses user preferences, liked items, and smart matching algorithms
 */
@Injectable()
export class RecommendationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get personalized item recommendations for a user
   * Algorithm considers:
   * - Similar value items (±20% tolerance)
   * - User's preferred categories (from liked items)
   * - Delivery method compatibility
   * - User's preferred delivery method from settings
   * - Item condition and freshness
   */
  async getRecommendations(userId: string, limit: number = 10): Promise<any[]> {
    // Get user's settings and preferences
    const userSettings = await this.prisma.userSettings.findUnique({
      where: { userId },
      select: {
        preferredDeliveryMethod: true,
        enableRecommendations: true,
      },
    });

    // If recommendations are disabled, return empty array
    if (userSettings && !userSettings.enableRecommendations) {
      return [];
    }

    // Get user's items to understand their trade value range
    const userItems = await this.prisma.item.findMany({
      where: {
        userId,
        status: ItemStatus.AVAILABLE,
      },
      select: {
        estimatedValue: true,
        category: true,
      },
    });

    // Get user's liked items to understand preferences
    const likedItems = await this.prisma.like.findMany({
      where: { userId },
      include: {
        item: {
          select: {
            category: true,
            estimatedValue: true,
          },
        },
      },
      take: 20, // Consider last 20 liked items
      orderBy: { createdAt: 'desc' },
    });

    // Calculate average value of user's items
    const userValues = userItems
      .filter((item) => item.estimatedValue)
      .map((item) => parseFloat(item.estimatedValue!.toString()));

    const avgUserValue =
      userValues.length > 0
        ? userValues.reduce((sum, val) => sum + val, 0) / userValues.length
        : null;

    // Extract preferred categories from liked items
    const preferredCategories = this.extractPreferredCategories(likedItems);

    // Build recommendation query
    const where: any = {
      userId: { not: userId }, // Exclude user's own items
      status: ItemStatus.AVAILABLE,
    };

    // Filter by preferred delivery method if set
    if (userSettings?.preferredDeliveryMethod) {
      where.deliveryMethods = {
        has: userSettings.preferredDeliveryMethod,
      };
    }

    // Filter by value range (±20% of user's average)
    if (avgUserValue) {
      const minValue = avgUserValue * 0.8;
      const maxValue = avgUserValue * 1.2;

      where.estimatedValue = {
        gte: minValue,
        lte: maxValue,
      };
    }

    // Get base recommendations
    const baseRecommendations = await this.prisma.item.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            reputationScore: true,
          },
        },
        images: {
          take: 1,
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
      },
      take: limit * 3, // Get more than needed for filtering
      orderBy: [
        { createdAt: 'desc' }, // Prefer newer items
      ],
    });

    // Score and rank recommendations
    const scoredRecommendations = baseRecommendations.map((item) => {
      let score = 0;

      // Category match bonus
      if (preferredCategories.includes(item.category)) {
        score += 10;
      }

      // Value similarity bonus
      if (avgUserValue && item.estimatedValue) {
        const itemValue = parseFloat(item.estimatedValue.toString());
        const valueDiff = Math.abs(itemValue - avgUserValue);
        const similarity = 1 - valueDiff / avgUserValue;
        score += similarity * 5;
      }

      // Reputation bonus
      score += item.user.reputationScore * 0.1;

      // Popularity bonus
      score += item._count.likes * 0.5;

      // Freshness bonus (newer items get higher score)
      const daysSinceCreation =
        (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
      const freshnessScore = Math.max(0, 5 - daysSinceCreation * 0.1);
      score += freshnessScore;

      return { ...item, recommendationScore: score };
    });

    // Sort by score and return top items
    return scoredRecommendations
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, limit);
  }

  /**
   * Extract preferred categories from liked items
   * Returns categories sorted by frequency
   */
  private extractPreferredCategories(likedItems: any[]): ItemCategory[] {
    const categoryCounts: Record<string, number> = {};

    likedItems.forEach((like) => {
      const category = like.item.category;
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    });

    // Sort by count and return top 3 categories
    return Object.entries(categoryCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category as ItemCategory);
  }

  /**
   * Get items similar to a specific item
   * Useful for "similar items" feature on item details page
   */
  async getSimilarItems(itemId: string, limit: number = 5): Promise<any[]> {
    // Get the target item
    const targetItem = await this.prisma.item.findUnique({
      where: { id: itemId },
      select: {
        userId: true,
        category: true,
        estimatedValue: true,
        deliveryMethods: true,
        condition: true,
      },
    });

    if (!targetItem) {
      return [];
    }

    // Build query for similar items
    const where: any = {
      id: { not: itemId }, // Exclude the item itself
      userId: { not: targetItem.userId }, // Exclude same user's items
      status: ItemStatus.AVAILABLE,
      category: targetItem.category, // Same category
    };

    // Similar value range (±30%)
    if (targetItem.estimatedValue) {
      const value = parseFloat(targetItem.estimatedValue.toString());
      where.estimatedValue = {
        gte: value * 0.7,
        lte: value * 1.3,
      };
    }

    // Similar delivery methods
    if (targetItem.deliveryMethods.length > 0) {
      where.deliveryMethods = {
        hasEvery: targetItem.deliveryMethods,
      };
    }

    const similarItems = await this.prisma.item.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            reputationScore: true,
          },
        },
        images: {
          take: 1,
          orderBy: { order: 'asc' },
        },
        _count: {
          select: {
            likes: true,
          },
        },
      },
      take: limit,
      orderBy: [{ createdAt: 'desc' }],
    });

    return similarItems;
  }
}

import { Cacheable, CacheInvalidate } from '@/cache/cache.module';
import { PrismaService } from '@/prisma/prisma.service';
import { UploadService } from '@/upload/upload.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { TradeStatus } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserFilterDto } from './dto/user-filter.dto';
import { UserProfileDto } from './dto/user-profile.dto';
import { UserStatisticsDto } from './dto/user-statistics.dto';

/**
 * Service handling user profile operations
 * Manages profile updates, avatar uploads, and public profile data
 */
@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private uploadService: UploadService,
  ) {}

  /**
   * Get all users with filtering and pagination
   * @param filters - Filter and pagination parameters
   * @returns Paginated users with metadata
   */
  async findAllFiltered(filters: UserFilterDto): Promise<{
    users: UserProfileDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      location,
      minReputation,
      maxReputation,
      search,
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = filters;

    // Build where clause
    const where: any = {};

    if (location) {
      where.location = { contains: location, mode: 'insensitive' };
    }

    if (minReputation !== undefined || maxReputation !== undefined) {
      where.reputationScore = {};
      if (minReputation !== undefined) {
        where.reputationScore.gte = minReputation;
      }
      if (maxReputation !== undefined) {
        where.reputationScore.lte = maxReputation;
      }
    }

    if (search) {
      where.OR = [
        { username: { contains: search, mode: 'insensitive' } },
        { bio: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Build orderBy clause
    const orderBy: any = { [sortBy]: sortOrder };

    // Get total count
    const total = await this.prisma.user.count({ where });

    // Get paginated users
    const skip = (page - 1) * limit;
    const users = await this.prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: {
            items: true,
            tradesProposed: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
    });

    return {
      users: users.map((user) => ({
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        reputationScore: user.reputationScore,
        createdAt: user.createdAt,
        itemsCount: user._count.items,
        tradesCount: user._count.tradesProposed,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get public user profile by ID (with Redis caching)
   * @param userId - User ID
   * @returns Public profile information with stats
   * @throws NotFoundException if user not found
   */
  @Cacheable({
    ttl: 600000, // 10 minutes
    keyGenerator: (userId: string) => `users:${userId}`,
  })
  async getUserProfile(userId: string): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: {
          select: {
            items: true,
            tradesProposed: {
              where: { status: 'COMPLETED' },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      reputationScore: user.reputationScore,
      createdAt: user.createdAt,
      itemsCount: user._count.items,
      tradesCount: user._count.tradesProposed,
    };
  }

  /**
   * Update user profile
   * @param userId - User ID
   * @param updateProfileDto - Profile data to update
   * @returns Updated profile information
   * @throws NotFoundException if user not found
   */
  @CacheInvalidate((userId: string) => [`users:${userId}:*`])
  async updateProfile(
    userId: string,
    updateProfileDto: UpdateProfileDto,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });

    return this.getUserProfile(userId);
  }

  /**
   * Upload user avatar to Cloudinary
   * @param userId - User ID
   * @param file - Avatar image file
   * @returns Updated profile with new avatar URL
   * @throws NotFoundException if user not found
   */
  @CacheInvalidate((userId: string) => [`users:${userId}:*`])
  async uploadAvatar(
    userId: string,
    file: Express.Multer.File,
  ): Promise<UserProfileDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${userId} not found`);
    }

    // Delete old avatar from Cloudinary if exists
    if (user.avatarUrl) {
      const publicId = this.extractPublicId(user.avatarUrl);
      if (publicId) {
        await this.uploadService.deleteImage(publicId);
      }
    }

    // Upload new avatar
    const uploadResult = await this.uploadService.uploadImage(
      file,
      'swapbuds/avatars',
    );

    // Update user with new avatar URL
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl: uploadResult.secure_url },
    });

    return this.getUserProfile(userId);
  }

  /**
   * Get user trade statistics
   * @param userId - User ID
   * @returns Trade statistics for the user
   */
  @Cacheable({ ttl: 300 })
  async getUserStatistics(userId: string): Promise<UserStatisticsDto> {
    // Verify user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get trade counts by status and role
    const [
      tradesInitiated,
      tradesReceived,
      completedTrades,
      acceptedTrades,
      rejectedTrades,
      cancelledTrades,
      expiredTrades,
      counterOffers,
      pendingAsProposer,
      pendingAsResponder,
    ] = await Promise.all([
      // Total trades initiated
      this.prisma.trade.count({
        where: { proposerId: userId },
      }),
      // Total trades received
      this.prisma.trade.count({
        where: { responderId: userId },
      }),
      // Completed trades
      this.prisma.trade.count({
        where: {
          OR: [{ proposerId: userId }, { responderId: userId }],
          status: TradeStatus.COMPLETED,
        },
      }),
      // Accepted trades
      this.prisma.trade.count({
        where: {
          OR: [{ proposerId: userId }, { responderId: userId }],
          status: TradeStatus.ACCEPTED,
        },
      }),
      // Rejected trades
      this.prisma.trade.count({
        where: {
          OR: [{ proposerId: userId }, { responderId: userId }],
          status: TradeStatus.REJECTED,
        },
      }),
      // Cancelled trades
      this.prisma.trade.count({
        where: {
          OR: [{ proposerId: userId }, { responderId: userId }],
          status: TradeStatus.CANCELLED,
        },
      }),
      // Expired trades
      this.prisma.trade.count({
        where: {
          OR: [{ proposerId: userId }, { responderId: userId }],
          status: TradeStatus.EXPIRED,
        },
      }),
      // Counter-offers made
      this.prisma.trade.count({
        where: {
          responderId: userId,
          counterOffers: { some: {} },
        },
      }),
      // Pending as proposer
      this.prisma.trade.count({
        where: {
          proposerId: userId,
          status: TradeStatus.PENDING,
        },
      }),
      // Pending as responder
      this.prisma.trade.count({
        where: {
          responderId: userId,
          status: TradeStatus.PENDING,
        },
      }),
    ]);

    // Calculate success rate
    const totalTrades = tradesInitiated + tradesReceived;
    const successRate =
      totalTrades > 0 ? (completedTrades / totalTrades) * 100 : 0;

    // Calculate average response time for trades received
    const respondedTrades = await this.prisma.trade.findMany({
      where: {
        responderId: userId,
        status: { in: [TradeStatus.ACCEPTED, TradeStatus.REJECTED] },
        updatedAt: { not: null },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let averageResponseTime: number | null = null;
    if (respondedTrades.length > 0) {
      const totalResponseTime = respondedTrades.reduce((sum, trade) => {
        const responseTime =
          trade.updatedAt.getTime() - trade.createdAt.getTime();
        return sum + responseTime;
      }, 0);

      // Convert to hours and round to 2 decimal places
      const hoursAverage =
        totalResponseTime / respondedTrades.length / (1000 * 60 * 60);
      averageResponseTime = Math.round(hoursAverage * 100) / 100;
    }

    return {
      totalTradesInitiated: tradesInitiated,
      totalTradesReceived: tradesReceived,
      totalCompletedTrades: completedTrades,
      totalAcceptedTrades: acceptedTrades,
      totalRejectedTrades: rejectedTrades,
      totalCancelledTrades: cancelledTrades,
      totalExpiredTrades: expiredTrades,
      successRate: Math.round(successRate * 100) / 100,
      averageResponseTime,
      totalCounterOffers: counterOffers,
      pendingAsProposer,
      pendingAsResponder,
    };
  }

  /**
   * Extract Cloudinary public ID from URL
   * @param url - Cloudinary URL
   * @returns Public ID or null
   */
  private extractPublicId(url: string): string | null {
    try {
      const match = url.match(/\/([^\/]+)\.[^.]+$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }
}

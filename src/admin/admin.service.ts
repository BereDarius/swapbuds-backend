import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AuditLogService } from './audit-log.service';

/**
 * Service for admin operations
 * Handles platform statistics, user management, and content moderation
 */
@Injectable()
export class AdminService {
  constructor(
    private prisma: PrismaService,
    private auditLog: AuditLogService,
  ) {}

  /**
   * Get platform statistics for admin dashboard
   */
  async getPlatformStats() {
    const [
      totalUsers,
      activeUsers,
      totalItems,
      availableItems,
      totalTrades,
      activeTrades,
      completedTrades,
      totalVerifications,
      pendingVerifications,
      approvedVerifications,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.item.count(),
      this.prisma.item.count({ where: { status: 'AVAILABLE' } }),
      this.prisma.trade.count(),
      this.prisma.trade.count({ where: { status: 'PENDING' } }),
      this.prisma.trade.count({ where: { status: 'COMPLETED' } }),
      this.prisma.userVerification.count(),
      this.prisma.userVerification.count({ where: { status: 'PENDING' } }),
      this.prisma.userVerification.count({ where: { status: 'APPROVED' } }),
    ]);

    // Get recent activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const [newUsers, newItems, newTrades] = await Promise.all([
      this.prisma.user.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.item.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
      this.prisma.trade.count({
        where: { createdAt: { gte: sevenDaysAgo } },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        active: activeUsers,
        inactive: totalUsers - activeUsers,
        newLast7Days: newUsers,
      },
      items: {
        total: totalItems,
        available: availableItems,
        inTrade: totalItems - availableItems,
        newLast7Days: newItems,
      },
      trades: {
        total: totalTrades,
        active: activeTrades,
        completed: completedTrades,
        newLast7Days: newTrades,
      },
      verifications: {
        total: totalVerifications,
        pending: pendingVerifications,
        approved: approvedVerifications,
      },
    };
  }

  /**
   * Get all users with pagination and filtering
   */
  async getUsers(params: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }) {
    const page = params.page || 1;
    const limit = params.limit || 20;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (params.search) {
      where.OR = [
        { username: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    if (params.isActive !== undefined) {
      where.isActive = params.isActive;
    }

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          username: true,
          email: true,
          isActive: true,
          isVerified: true,
          reputationScore: true,
          createdAt: true,
          lastLoginAt: true,
          _count: {
            select: {
              items: true,
              tradesProposed: true,
              tradesReceived: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get detailed user information
   */
  async getUserDetails(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        isActive: true,
        isVerified: true,
        reputationScore: true,
        bio: true,
        location: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        _count: {
          select: {
            items: true,
            tradesProposed: true,
            tradesReceived: true,
            reviewsGiven: true,
            reviewsReceived: true,
            likes: true,
            comments: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get recent audit logs for this user
    const auditLogs = await this.auditLog.getLogsForTarget('User', userId, 10);

    return {
      ...user,
      auditLogs,
    };
  }

  /**
   * Ban a user
   */
  async banUser(userId: string, adminId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Regular users can be banned (admins are in separate table)
    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    await this.auditLog.log({
      performedById: adminId,
      action: AuditAction.USER_BAN,
      description: `User ${user.username} (${user.email}) banned. Reason: ${reason}`,
      targetType: 'User',
      targetId: userId,
      metadata: { reason },
    });

    return { message: 'User banned successfully' };
  }

  /**
   * Unban a user
   */
  async unbanUser(userId: string, adminId: string, reason: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { isActive: true },
    });

    await this.auditLog.log({
      performedById: adminId,
      action: AuditAction.USER_UNBAN,
      description: `User ${user.username} (${user.email}) unbanned. Reason: ${reason}`,
      targetType: 'User',
      targetId: userId,
      metadata: { reason },
    });

    return { message: 'User unbanned successfully' };
  }

  /**
   * Bulk ban users
   */
  async bulkBanUsers(
    userIds: string[],
    adminId: string,
    reason: string,
    ipAddress?: string,
  ) {
    // Validate all users exist
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
      },
    });

    if (users.length !== userIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    // Check for already banned users
    const alreadyBanned = users.filter((u) => !u.isActive);
    if (alreadyBanned.length > 0) {
      throw new BadRequestException(
        `Some users are already banned: ${alreadyBanned.map((u) => u.username).join(', ')}`,
      );
    }

    // Bulk ban users
    await this.prisma.user.updateMany({
      where: {
        id: { in: userIds },
      },
      data: {
        isActive: false,
      },
    });

    // Create audit logs for each ban
    await Promise.all(
      users.map((user) =>
        this.auditLog.log({
          performedById: adminId,
          action: AuditAction.USER_BAN,
          description: `User ${user.username} (${user.email}) banned. Reason: ${reason}`,
          targetType: 'User',
          targetId: user.id,
          metadata: { reason, ipAddress },
        }),
      ),
    );

    return {
      success: true,
      bannedCount: users.length,
      bannedUsers: users.map((u) => ({ id: u.id, username: u.username })),
    };
  }

  /**
   * Bulk unban users
   */
  async bulkUnbanUsers(
    userIds: string[],
    adminId: string,
    reason: string,
    ipAddress?: string,
  ) {
    // Validate all users exist
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: userIds },
      },
      select: {
        id: true,
        username: true,
        email: true,
        isActive: true,
      },
    });

    if (users.length !== userIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    // Check for already active users
    const alreadyActive = users.filter((u) => u.isActive);
    if (alreadyActive.length > 0) {
      throw new BadRequestException(
        `Some users are not banned: ${alreadyActive.map((u) => u.username).join(', ')}`,
      );
    }

    // Bulk unban users
    await this.prisma.user.updateMany({
      where: {
        id: { in: userIds },
      },
      data: {
        isActive: true,
      },
    });

    // Create audit logs
    await Promise.all(
      users.map((user) =>
        this.auditLog.log({
          performedById: adminId,
          action: AuditAction.USER_UNBAN,
          description: `User ${user.username} (${user.email}) unbanned. Reason: ${reason}`,
          targetType: 'User',
          targetId: user.id,
          metadata: { reason, ipAddress },
        }),
      ),
    );

    return {
      success: true,
      unbannedCount: users.length,
      unbannedUsers: users.map((u) => ({ id: u.id, username: u.username })),
    };
  }
}

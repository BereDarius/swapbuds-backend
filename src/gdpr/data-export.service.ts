import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Service for exporting user data (GDPR Article 15 - Right to Access)
 */
@Injectable()
export class DataExportService {
  private readonly logger = new Logger(DataExportService.name);

  // Store exports in memory temporarily (in production, use S3 or similar)
  private exports = new Map<
    string,
    { data: any; createdAt: Date; expiresAt: Date }
  >();

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generate comprehensive data export for a user
   */
  async generateExport(userId: string): Promise<string> {
    this.logger.log(`Generating data export for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Collect all user data
    const [
      profile,
      items,
      trades,
      messages,
      reviews,
      notifications,
      settings,
      preferences,
      likes,
      comments,
      disputes,
      verification,
      supportChats,
    ] = await Promise.all([
      this.getProfileData(userId),
      this.getItemsData(userId),
      this.getTradesData(userId),
      this.getMessagesData(userId),
      this.getReviewsData(userId),
      this.getNotificationsData(userId),
      this.getSettingsData(userId),
      this.getPreferencesData(userId),
      this.getLikesData(userId),
      this.getCommentsData(userId),
      this.getDisputesData(userId),
      this.getVerificationData(userId),
      this.getSupportChatsData(userId),
    ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      userId,
      profile,
      items,
      trades,
      messages,
      reviews,
      notifications,
      settings,
      preferences,
      likes,
      comments,
      disputes,
      verification,
      supportChats,
      metadata: {
        exportedBy: userId,
        exportReason: 'GDPR Article 15 - Right to Access',
        dataIncluded: [
          'profile',
          'items',
          'trades',
          'messages',
          'reviews',
          'notifications',
          'settings',
          'preferences',
          'likes',
          'comments',
          'disputes',
          'verification',
          'supportChats',
        ],
      },
    };

    // Store export temporarily (expires in 7 days)
    const exportId = `export-${userId}-${Date.now()}`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    this.exports.set(exportId, {
      data: exportData,
      createdAt: new Date(),
      expiresAt,
    });

    this.logger.log(`Data export generated: ${exportId}`);
    return exportId;
  }

  /**
   * Get export data by ID
   */
  async getExport(exportId: string): Promise<any> {
    const exportData = this.exports.get(exportId);

    if (!exportData) {
      throw new NotFoundException('Export not found or expired');
    }

    if (new Date() > exportData.expiresAt) {
      this.exports.delete(exportId);
      throw new NotFoundException('Export has expired');
    }

    return exportData.data;
  }

  /**
   * Check if export exists and is valid
   */
  isExportValid(exportId: string): boolean {
    const exportData = this.exports.get(exportId);
    if (!exportData) return false;
    return new Date() <= exportData.expiresAt;
  }

  /**
   * Clean up expired exports (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async cleanupExpiredExports(): Promise<void> {
    const now = new Date();
    let cleaned = 0;

    for (const [id, data] of this.exports.entries()) {
      if (now > data.expiresAt) {
        this.exports.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} expired data exports`);
    }
  }

  // Private methods for collecting specific data types

  private async getProfileData(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        bio: true,
        location: true,
        reputationScore: true,
        role: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
        isActive: true,
        isVerified: true,
      },
    });
    return user;
  }

  private async getItemsData(userId: string) {
    return await this.prisma.item.findMany({
      where: { userId },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        condition: true,
        estimatedValue: true,
        currency: true,
        images: true,
        status: true,
        deliveryMethods: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private async getTradesData(userId: string) {
    const [proposed, received] = await Promise.all([
      this.prisma.trade.findMany({
        where: { proposerId: userId },
        select: {
          id: true,
          status: true,
          itemOfferedId: true,
          itemRequestedId: true,
          deliveryMethod: true,
          createdAt: true,
          completedAt: true,
        },
      }),
      this.prisma.trade.findMany({
        where: { responderId: userId },
        select: {
          id: true,
          status: true,
          itemOfferedId: true,
          itemRequestedId: true,
          deliveryMethod: true,
          createdAt: true,
          completedAt: true,
        },
      }),
    ]);

    return { proposed, received };
  }

  private async getMessagesData(userId: string) {
    return await this.prisma.message.findMany({
      where: { senderId: userId },
      select: {
        id: true,
        content: true,
        conversationId: true,
        createdAt: true,
        isRead: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getReviewsData(userId: string) {
    const [given, received] = await Promise.all([
      this.prisma.review.findMany({
        where: { authorId: userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          tradeId: true,
          createdAt: true,
        },
      }),
      this.prisma.review.findMany({
        where: { targetId: userId },
        select: {
          id: true,
          rating: true,
          comment: true,
          tradeId: true,
          createdAt: true,
        },
      }),
    ]);

    return { given, received };
  }

  private async getNotificationsData(userId: string) {
    return await this.prisma.notification.findMany({
      where: { userId },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100, // Last 100 notifications
    });
  }

  private async getSettingsData(userId: string) {
    return await this.prisma.userSettings.findUnique({
      where: { userId },
    });
  }

  private async getPreferencesData(userId: string) {
    return await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });
  }

  private async getLikesData(userId: string) {
    return await this.prisma.like.findMany({
      where: { userId },
      select: {
        id: true,
        itemId: true,
        createdAt: true,
      },
    });
  }

  private async getCommentsData(userId: string) {
    return await this.prisma.comment.findMany({
      where: { userId },
      select: {
        id: true,
        content: true,
        itemId: true,
        createdAt: true,
      },
    });
  }

  private async getDisputesData(userId: string) {
    const [reported, against] = await Promise.all([
      this.prisma.dispute.findMany({
        where: { reporterId: userId },
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      }),
      this.prisma.dispute.findMany({
        where: { reportedUserId: userId },
        select: {
          id: true,
          reason: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return { reported, against };
  }

  private async getVerificationData(userId: string) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { userId },
      select: {
        id: true,
        status: true,
        documentType: true,
        submittedAt: true,
        reviewedAt: true,
        // Note: documentUrl is excluded for security
      },
    });

    return verification;
  }

  private async getSupportChatsData(userId: string) {
    return await this.prisma.supportChat.findMany({
      where: { userId },
      select: {
        id: true,
        status: true,
        subject: true,
        createdAt: true,
        closedAt: true,
        messages: {
          select: {
            id: true,
            message: true,
            createdAt: true,
          },
        },
      },
    });
  }
}

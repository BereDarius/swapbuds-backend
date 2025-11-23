import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * Service for handling account deletion and data anonymization
 * (GDPR Article 17 - Right to Erasure)
 */
@Injectable()
export class DataDeletionService {
  private readonly logger = new Logger(DataDeletionService.name);

  // Grace period before permanent deletion (30 days)
  private readonly GRACE_PERIOD_DAYS = 30;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Request account deletion (soft delete with grace period)
   * @param userId - User ID requesting deletion
   */
  async requestDeletion(userId: string): Promise<{
    message: string;
    scheduledDeletionDate: Date;
    gracePeriodDays: number;
  }> {
    this.logger.log(`Account deletion requested for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (user.deletionRequestedAt) {
      throw new BadRequestException('Account deletion already requested');
    }

    // Calculate scheduled deletion date
    const scheduledDeletionDate = new Date();
    scheduledDeletionDate.setDate(
      scheduledDeletionDate.getDate() + this.GRACE_PERIOD_DAYS,
    );

    // Mark account for deletion
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: new Date(),
        scheduledDeletionAt: scheduledDeletionDate,
        isActive: false, // Deactivate immediately
      },
    });

    this.logger.log(
      `Account marked for deletion. Scheduled: ${scheduledDeletionDate.toISOString()}`,
    );

    return {
      message: `Account deletion scheduled. You have ${this.GRACE_PERIOD_DAYS} days to cancel this request.`,
      scheduledDeletionDate,
      gracePeriodDays: this.GRACE_PERIOD_DAYS,
    };
  }

  /**
   * Cancel account deletion request (during grace period)
   */
  async cancelDeletion(userId: string): Promise<{ message: string }> {
    this.logger.log(`Canceling account deletion for user: ${userId}`);

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.deletionRequestedAt) {
      throw new BadRequestException('No deletion request found');
    }

    if (user.scheduledDeletionAt && new Date() > user.scheduledDeletionAt) {
      throw new BadRequestException(
        'Grace period expired. Account cannot be recovered.',
      );
    }

    // Restore account
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletionRequestedAt: null,
        scheduledDeletionAt: null,
        isActive: true,
      },
    });

    this.logger.log(`Account deletion canceled for user: ${userId}`);

    return {
      message: 'Account deletion canceled. Your account has been restored.',
    };
  }

  /**
   * Process account deletion and anonymize data
   */
  async processAccountDeletion(userId: string): Promise<void> {
    this.logger.log(`Processing account deletion for user: ${userId}`);

    try {
      // Anonymize user data
      await this.anonymizeUserData(userId);

      // Delete user-specific data that should not be preserved
      await this.deleteUserSpecificData(userId);

      // Finally, delete the user account
      await this.prisma.user.delete({
        where: { id: userId },
      });

      this.logger.log(`Account successfully deleted and anonymized: ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to delete account ${userId}:`,
        error.stack || error,
      );
      throw error;
    }
  }

  /**
   * Anonymize user data while preserving transaction history
   */
  private async anonymizeUserData(userId: string): Promise<void> {
    this.logger.log(`Anonymizing data for user: ${userId}`);

    // Anonymize reviews (keep for other users, but remove personal info)
    await this.prisma.review.updateMany({
      where: { authorId: userId },
      data: {
        comment: '[Deleted User Comment]',
      },
    });

    // Anonymize comments
    await this.prisma.comment.updateMany({
      where: { userId },
      data: {
        content: '[Deleted User Comment]',
      },
    });

    // Anonymize messages (keep conversation history but remove content)
    await this.prisma.message.updateMany({
      where: { senderId: userId },
      data: {
        content: '[Message deleted]',
      },
    });

    // Mark items as deleted user's items
    await this.prisma.item.updateMany({
      where: { userId },
      data: {
        status: 'TRADED', // Mark as no longer available
        description: '[Item from deleted account]',
      },
    });

    this.logger.log(`Data anonymized for user: ${userId}`);
  }

  /**
   * Delete user-specific data that should not be preserved
   */
  private async deleteUserSpecificData(userId: string): Promise<void> {
    this.logger.log(`Deleting user-specific data for: ${userId}`);

    // Delete in order to respect foreign key constraints
    await this.prisma.$transaction([
      // Delete notifications
      this.prisma.notification.deleteMany({ where: { userId } }),

      // Delete notification preferences
      this.prisma.notificationPreferences.deleteMany({ where: { userId } }),

      // Delete user settings
      this.prisma.userSettings.deleteMany({ where: { userId } }),

      // Delete likes
      this.prisma.like.deleteMany({ where: { userId } }),

      // Delete support chat messages
      this.prisma.supportMessage.deleteMany({
        where: { senderId: userId },
      }),

      // Delete support chats as user
      this.prisma.supportChat.deleteMany({ where: { userId } }),

      // Delete verification data
      this.prisma.userVerification.deleteMany({ where: { userId } }),

      // Delete flagged items reported by user
      this.prisma.flaggedItem.updateMany({
        where: { reportedById: userId },
        data: { reportedById: null },
      }),
    ]);

    this.logger.log(`User-specific data deleted for: ${userId}`);
  }

  /**
   * Scheduled job to process pending deletions (runs daily)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processPendingDeletions(): Promise<void> {
    this.logger.log('Processing pending account deletions...');

    const now = new Date();

    // Find users scheduled for deletion
    const usersToDelete = await this.prisma.user.findMany({
      where: {
        scheduledDeletionAt: {
          lte: now,
        },
        deletionRequestedAt: {
          not: null,
        },
      },
      select: { id: true, username: true, email: true },
    });

    if (usersToDelete.length === 0) {
      this.logger.log('No accounts pending deletion');
      return;
    }

    this.logger.log(`Found ${usersToDelete.length} accounts to delete`);

    // Process each deletion
    for (const user of usersToDelete) {
      try {
        await this.processAccountDeletion(user.id);
        this.logger.log(`Deleted account: ${user.username} (${user.email})`);
      } catch (error) {
        this.logger.error(
          `Failed to delete account ${user.username}:`,
          error.stack || error,
        );
      }
    }

    this.logger.log(`Completed processing ${usersToDelete.length} deletions`);
  }

  /**
   * Get deletion status for a user
   */
  async getDeletionStatus(userId: string): Promise<{
    deletionRequested: boolean;
    deletionRequestedAt: Date | null;
    scheduledDeletionAt: Date | null;
    daysRemaining: number | null;
    canCancel: boolean;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        deletionRequestedAt: true,
        scheduledDeletionAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const deletionRequested = !!user.deletionRequestedAt;
    let daysRemaining: number | null = null;
    let canCancel = false;

    if (user.scheduledDeletionAt) {
      const msRemaining =
        user.scheduledDeletionAt.getTime() - new Date().getTime();
      daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
      canCancel = daysRemaining > 0;
    }

    return {
      deletionRequested,
      deletionRequestedAt: user.deletionRequestedAt,
      scheduledDeletionAt: user.scheduledDeletionAt,
      daysRemaining,
      canCancel,
    };
  }
}

import { Cacheable, CacheInvalidate } from '@/cache/cache.module';
import { MailService } from '@/mail/mail.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';
import { NotificationsGateway } from './gateway/notifications.gateway';

/**
 * Service for managing user notifications
 * Handles creation, retrieval, and updates of notifications
 */
@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => NotificationsGateway))
    private notificationsGateway: NotificationsGateway,
    private mailService: MailService,
  ) {}

  /**
   * Create a new notification for a user
   * @param createNotificationDto - Notification data
   * @returns Created notification or null if user disabled this notification type
   */
  @CacheInvalidate((dto: CreateNotificationDto) => [
    `users:${dto.userId}:notifications:*`,
  ])
  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto | null> {
    // Check if user wants push/in-app notifications for this type
    const shouldSend = await this.shouldSendPush(
      createNotificationDto.userId,
      createNotificationDto.type,
    );

    if (!shouldSend) {
      return null;
    }

    const notification = await this.prisma.notification.create({
      data: {
        type: createNotificationDto.type,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        userId: createNotificationDto.userId,
        metadata: createNotificationDto.metadata || {},
      },
    });

    const response = this.formatNotificationResponse(notification);

    // Emit real-time notification to user if they're connected
    this.notificationsGateway.emitNotificationToUser(
      createNotificationDto.userId,
      response,
    );

    return response;
  }

  /**
   * Get all notifications for a user
   * @param userId - User ID
   * @param unreadOnly - Filter for unread notifications only
   * @returns List of notifications
   */
  async getUserNotifications(
    userId: string,
    unreadOnly: boolean = false,
  ): Promise<NotificationResponseDto[]> {
    const notifications = await this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly && { isRead: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return notifications.map((notification) =>
      this.formatNotificationResponse(notification),
    );
  }

  /**
   * Get count of unread notifications for a user (with Redis caching)
   * @param userId - User ID
   * @returns Count of unread notifications
   */
  @Cacheable({
    ttl: 60000, // 1 minute
    keyGenerator: (userId: string) => `users:${userId}:notifications:unread`,
  })
  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  /**
   * Mark a notification as read
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   * @returns Updated notification
   */
  @CacheInvalidate((notificationId: string, userId: string) => [
    `users:${userId}:notifications:*`,
  ])
  async markAsRead(
    notificationId: string,
    userId: string,
  ): Promise<NotificationResponseDto> {
    // Check if notification exists and belongs to user
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only mark your own notifications as read',
      );
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });

    // Emit real-time update
    this.notificationsGateway.emitNotificationRead(userId, notificationId);

    return this.formatNotificationResponse(updated);
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - User ID
   * @returns Count of updated notifications
   */
  @CacheInvalidate((userId: string) => [`users:${userId}:notifications:*`])
  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
      },
    });

    // Emit real-time update
    this.notificationsGateway.emitAllNotificationsRead(userId, result.count);

    return { count: result.count };
  }

  /**
   * Delete a notification
   * @param notificationId - Notification ID
   * @param userId - User ID (for authorization)
   */
  async deleteNotification(
    notificationId: string,
    userId: string,
  ): Promise<void> {
    // Check if notification exists and belongs to user
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException(
        'You can only delete your own notifications',
      );
    }

    await this.prisma.notification.delete({
      where: { id: notificationId },
    });

    // Emit real-time update
    this.notificationsGateway.emitNotificationDeleted(userId, notificationId);
  }

  /**
   * Helper method to create trade-related notifications
   * @param type - Notification type
   * @param recipientId - User ID to receive notification
   * @param trade - Trade object
   */
  async createTradeNotification(
    type: NotificationType,
    recipientId: string,
    trade: any,
  ): Promise<void> {
    let title: string;
    let message: string;

    switch (type) {
      case NotificationType.TRADE_PROPOSAL:
        title = 'New Trade Proposal';
        message = `${trade.proposer.username} wants to trade "${trade.itemOffered.title}" for your "${trade.itemRequested.title}"`;
        break;
      case NotificationType.TRADE_ACCEPTED:
        title = 'Trade Accepted';
        message = `${trade.responder.username} accepted your trade proposal for "${trade.itemRequested.title}"`;
        break;
      case NotificationType.TRADE_REJECTED:
        title = 'Trade Rejected';
        message = `${trade.responder.username} rejected your trade proposal for "${trade.itemRequested.title}"`;
        break;
      case NotificationType.TRADE_CANCELLED:
        title = 'Trade Cancelled';
        message = `${trade.proposer.username} cancelled the trade proposal for "${trade.itemRequested.title}"`;
        break;
      case NotificationType.TRADE_COMPLETED:
        title = 'Trade Completed';
        message = `Your trade with ${trade.responder.username} has been completed successfully`;
        break;
      default:
        return;
    }

    // Create in-app notification (checks preferences internally)
    await this.createNotification({
      type,
      title,
      message,
      userId: recipientId,
      metadata: {
        tradeId: trade.id,
        itemOfferedId: trade.itemOfferedId,
        itemRequestedId: trade.itemRequestedId,
      },
    });

    // Send email notification if user preferences allow
    await this.sendTradeEmail(type, recipientId, trade);
  }

  /**
   * Send trade-related email notification
   * @param type - Notification type
   * @param recipientId - User ID to receive email
   * @param trade - Trade object
   */
  private async sendTradeEmail(
    type: NotificationType,
    recipientId: string,
    trade: any,
  ): Promise<void> {
    // Check if user wants email for this notification type
    const shouldSend = await this.shouldSendEmail(recipientId, type);
    if (!shouldSend) {
      return;
    }

    // Get recipient user with email
    const recipient = await this.prisma.user.findUnique({
      where: { id: recipientId },
      select: { email: true, username: true },
    });

    if (!recipient) {
      return;
    }

    try {
      switch (type) {
        case NotificationType.TRADE_PROPOSAL:
          await this.mailService.sendTradeProposal(
            recipient.email,
            recipient.username,
            {
              proposerName: trade.proposer.username,
              offeredItemName: trade.itemOffered.title,
              requestedItemName: trade.itemRequested.title,
              tradeId: trade.id,
            },
          );
          break;
        case NotificationType.TRADE_ACCEPTED:
          await this.mailService.sendTradeAccepted(
            recipient.email,
            recipient.username,
            {
              responderName: trade.responder.username,
              offeredItemName: trade.itemOffered.title,
              requestedItemName: trade.itemRequested.title,
              tradeId: trade.id,
            },
          );
          break;
        case NotificationType.TRADE_REJECTED:
          await this.mailService.sendTradeRejected(
            recipient.email,
            recipient.username,
            {
              responderName: trade.responder.username,
              offeredItemName: trade.itemOffered.title,
              requestedItemName: trade.itemRequested.title,
              tradeId: trade.id,
            },
          );
          break;
        case NotificationType.TRADE_CANCELLED:
          await this.mailService.sendTradeCancelled(
            recipient.email,
            recipient.username,
            {
              proposerName: trade.proposer.username,
              offeredItemName: trade.itemOffered.title,
              requestedItemName: trade.itemRequested.title,
              tradeId: trade.id,
            },
          );
          break;
        default:
          break;
      }
    } catch (error) {
      // Log error but don't fail the notification creation
      console.error('Failed to send email notification:', error);
    }
  }

  /**
   * Get notification preferences for a user
   * Creates default preferences if they don't exist
   * @param userId - User ID
   * @returns User's notification preferences
   */
  async getPreferences(userId: string): Promise<any> {
    let preferences = await this.prisma.notificationPreferences.findUnique({
      where: { userId },
    });

    // Create default preferences if they don't exist
    if (!preferences) {
      preferences = await this.prisma.notificationPreferences.create({
        data: { userId },
      });
    }

    return preferences;
  }

  /**
   * Update notification preferences for a user
   * @param userId - User ID
   * @param updateData - Preferences to update
   * @returns Updated preferences
   */
  async updatePreferences(userId: string, updateData: any): Promise<any> {
    // Ensure preferences exist
    await this.getPreferences(userId);

    // Update preferences
    return this.prisma.notificationPreferences.update({
      where: { userId },
      data: updateData,
    });
  }

  /**
   * Check if user wants email notifications for a specific type
   * @param userId - User ID
   * @param notificationType - Type of notification
   * @returns True if user wants email for this type
   */
  async shouldSendEmail(
    userId: string,
    notificationType: NotificationType,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    switch (notificationType) {
      case NotificationType.TRADE_PROPOSAL:
        return preferences.emailTradeProposal;
      case NotificationType.TRADE_ACCEPTED:
        return preferences.emailTradeAccepted;
      case NotificationType.TRADE_REJECTED:
        return preferences.emailTradeRejected;
      case NotificationType.TRADE_CANCELLED:
        return preferences.emailTradeCancelled;
      case NotificationType.NEW_MESSAGE:
        return preferences.emailNewMessage;
      case NotificationType.NEW_COMMENT:
        return preferences.emailNewComment;
      case NotificationType.NEW_LIKE:
        return preferences.emailNewLike;
      case NotificationType.NEW_REVIEW:
        return preferences.emailNewReview;
      default:
        return true;
    }
  }

  /**
   * Check if user wants push/in-app notifications for a specific type
   * @param userId - User ID
   * @param notificationType - Type of notification
   * @returns True if user wants push notification for this type
   */
  async shouldSendPush(
    userId: string,
    notificationType: NotificationType,
  ): Promise<boolean> {
    const preferences = await this.getPreferences(userId);

    switch (notificationType) {
      case NotificationType.TRADE_PROPOSAL:
        return preferences.pushTradeProposal;
      case NotificationType.TRADE_ACCEPTED:
        return preferences.pushTradeAccepted;
      case NotificationType.TRADE_REJECTED:
        return preferences.pushTradeRejected;
      case NotificationType.TRADE_CANCELLED:
        return preferences.pushTradeCancelled;
      case NotificationType.NEW_MESSAGE:
        return preferences.pushNewMessage;
      case NotificationType.NEW_COMMENT:
        return preferences.pushNewComment;
      case NotificationType.NEW_LIKE:
        return preferences.pushNewLike;
      case NotificationType.NEW_REVIEW:
        return preferences.pushNewReview;
      default:
        return true;
    }
  }

  /**
   * Format notification response
   * @param notification - Raw notification from database
   * @returns Formatted notification response
   */
  private formatNotificationResponse(
    notification: any,
  ): NotificationResponseDto {
    return {
      id: notification.id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      isRead: notification.isRead,
      metadata: notification.metadata as Record<string, any>,
      createdAt: notification.createdAt,
    };
  }
}

import { PrismaService } from '@/prisma/prisma.service';
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationResponseDto } from './dto/notification-response.dto';

/**
 * Service for managing user notifications
 * Handles creation, retrieval, and updates of notifications
 */
@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new notification for a user
   * @param createNotificationDto - Notification data
   * @returns Created notification
   */
  async createNotification(
    createNotificationDto: CreateNotificationDto,
  ): Promise<NotificationResponseDto> {
    const notification = await this.prisma.notification.create({
      data: {
        type: createNotificationDto.type,
        title: createNotificationDto.title,
        message: createNotificationDto.message,
        userId: createNotificationDto.userId,
        metadata: createNotificationDto.metadata || {},
      },
    });

    return this.formatNotificationResponse(notification);
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
   * Get count of unread notifications for a user
   * @param userId - User ID
   * @returns Count of unread notifications
   */
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

    return this.formatNotificationResponse(updated);
  }

  /**
   * Mark all notifications as read for a user
   * @param userId - User ID
   * @returns Count of updated notifications
   */
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
      case NotificationType.TRADE_COMPLETED:
        title = 'Trade Completed';
        message = `Your trade with ${trade.responder.username} has been completed successfully`;
        break;
      default:
        return;
    }

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

import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { Logger, UseGuards } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket Gateway for real-time notifications
 * Handles client connections and broadcasts notification events
 */
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/notifications',
})
export class NotificationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  /**
   * Handle new client connection
   * @param client - Socket client
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   * @param client - Socket client
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove socket from user's socket set
    const userId = (client as any).userId;
    if (userId) {
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
    }
  }

  /**
   * Subscribe to user's notification room
   * @param client - Socket client
   * @param userId - User ID to subscribe to
   */
  @SubscribeMessage('subscribe')
  @UseGuards(WsJwtGuard)
  handleSubscribe(client: Socket, userId: string) {
    // Store userId on socket for disconnection cleanup
    (client as any).userId = userId;

    // Join user's notification room
    client.join(`user:${userId}`);

    // Track socket for this user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to user:${userId}`);
    return { success: true, message: 'Subscribed to notifications' };
  }

  /**
   * Unsubscribe from user's notification room
   * @param client - Socket client
   * @param userId - User ID to unsubscribe from
   */
  @SubscribeMessage('unsubscribe')
  @UseGuards(WsJwtGuard)
  handleUnsubscribe(client: Socket, userId: string) {
    client.leave(`user:${userId}`);

    // Remove socket from tracking
    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`Client ${client.id} unsubscribed from user:${userId}`);
    return { success: true, message: 'Unsubscribed from notifications' };
  }

  /**
   * Emit new notification to user
   * @param userId - User ID
   * @param notification - Notification data
   */
  emitNotificationToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
    this.logger.log(`Emitted notification to user:${userId}`);
  }

  /**
   * Emit notification read status update to user
   * @param userId - User ID
   * @param notificationId - Notification ID
   */
  emitNotificationRead(userId: string, notificationId: string) {
    this.server
      .to(`user:${userId}`)
      .emit('notificationRead', { notificationId });
    this.logger.log(
      `Emitted notification read status to user:${userId}, notificationId:${notificationId}`,
    );
  }

  /**
   * Emit all notifications marked as read to user
   * @param userId - User ID
   * @param count - Number of notifications marked as read
   */
  emitAllNotificationsRead(userId: string, count: number) {
    this.server.to(`user:${userId}`).emit('allNotificationsRead', { count });
    this.logger.log(
      `Emitted all notifications read to user:${userId}, count:${count}`,
    );
  }

  /**
   * Emit notification deletion to user
   * @param userId - User ID
   * @param notificationId - Notification ID
   */
  emitNotificationDeleted(userId: string, notificationId: string) {
    this.server
      .to(`user:${userId}`)
      .emit('notificationDeleted', { notificationId });
    this.logger.log(
      `Emitted notification deleted to user:${userId}, notificationId:${notificationId}`,
    );
  }

  /**
   * Emit new message to user
   * @param userId - User ID
   * @param message - Message data
   */
  emitMessageToUser(userId: string, message: any) {
    this.server.to(`user:${userId}`).emit('message', message);
    this.logger.log(`Emitted message to user:${userId}`);
  }

  /**
   * Emit message read status update to user
   * @param userId - User ID
   * @param messageId - Message ID
   * @param conversationId - Conversation ID
   */
  emitMessageRead(userId: string, messageId: string, conversationId: string) {
    this.server
      .to(`user:${userId}`)
      .emit('messageRead', { messageId, conversationId });
    this.logger.log(
      `Emitted message read status to user:${userId}, messageId:${messageId}`,
    );
  }

  /**
   * Emit conversation read status update to user
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param count - Number of messages marked as read
   */
  emitConversationRead(userId: string, conversationId: string, count: number) {
    this.server
      .to(`user:${userId}`)
      .emit('conversationRead', { conversationId, count });
    this.logger.log(
      `Emitted conversation read to user:${userId}, conversationId:${conversationId}, count:${count}`,
    );
  }

  /**
   * Emit message deletion to user
   * @param userId - User ID
   * @param messageId - Message ID
   * @param conversationId - Conversation ID
   */
  emitMessageDeleted(
    userId: string,
    messageId: string,
    conversationId: string,
  ) {
    this.server
      .to(`user:${userId}`)
      .emit('messageDeleted', { messageId, conversationId });
    this.logger.log(
      `Emitted message deleted to user:${userId}, messageId:${messageId}`,
    );
  }

  /**
   * Emit typing indicator to user
   * @param userId - User ID
   * @param conversationId - Conversation ID
   * @param isTyping - Whether user is typing
   * @param typerUsername - Username of person typing
   */
  emitTyping(
    userId: string,
    conversationId: string,
    isTyping: boolean,
    typerUsername: string,
  ) {
    this.server
      .to(`user:${userId}`)
      .emit('typing', { conversationId, isTyping, typerUsername });
  }

  /**
   * Check if user is online (has active connections)
   * @param userId - User ID
   * @returns True if user has active connections
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get number of active connections for a user
   * @param userId - User ID
   * @returns Number of active connections
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}

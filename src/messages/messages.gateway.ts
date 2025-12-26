import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { Logger, UseGuards } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

/**
 * WebSocket Gateway for real-time messaging
 * Handles direct messages between users with typing indicators and real-time delivery
 * Namespace: /user - User-facing events only
 */
@WebSocketGateway({
  namespace: '/user',
  cors: {
    origin: (
      process.env.CORS_ORIGINS ||
      'http://localhost:3000,http://localhost:5173,http://localhost:4200'
    ).split(','),
    credentials: true,
  },
})
export class MessagesGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(MessagesGateway.name);
  private userSockets = new Map<string, Set<string>>(); // userId -> Set of socketIds

  /**
   * Handle new client connection
   */
  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  /**
   * Handle client disconnection
   */
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove socket from user's socket set
    const userId = client.data.userId;
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
   * Subscribe to user's message room
   * Client should call this after connecting to receive messages
   */
  @SubscribeMessage('subscribe')
  @UseGuards(WsJwtGuard)
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
    // userId is already set by WsJwtGuard in client.data.userId
    const authenticatedUserId = client.data.userId;

    // Ensure user can only subscribe to their own messages
    if (userId !== authenticatedUserId) {
      this.logger.warn(
        `User ${authenticatedUserId} attempted to subscribe to ${userId}'s messages`,
      );
      return {
        success: false,
        message: 'Cannot subscribe to another user',
      };
    }

    // Join user's room
    client.join(`user:${userId}`);

    // Track socket for this user
    if (!this.userSockets.has(userId)) {
      this.userSockets.set(userId, new Set());
    }
    this.userSockets.get(userId)!.add(client.id);

    this.logger.log(`Client ${client.id} subscribed to user:${userId}`);
    return { success: true, message: 'Subscribed to messages' };
  }

  /**
   * Unsubscribe from user's message room
   */
  @SubscribeMessage('unsubscribe')
  @UseGuards(WsJwtGuard)
  handleUnsubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() userId: string,
  ) {
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
    return { success: true, message: 'Unsubscribed from messages' };
  }

  /**
   * Handle typing indicator
   * Broadcasts typing status to the other user in the conversation
   */
  @SubscribeMessage('typing')
  @UseGuards(WsJwtGuard)
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: { conversationId: string; isTyping: boolean; username: string },
  ) {
    const userId = client.data.userId;

    if (!userId || !data.conversationId) {
      return { success: false, message: 'Invalid data' };
    }

    // Broadcast typing indicator to all clients in the conversation except sender
    client.to(`conversation:${data.conversationId}`).emit('typing', {
      conversationId: data.conversationId,
      isTyping: data.isTyping,
      typerUsername: data.username,
    });

    this.logger.debug(
      `User ${data.username} ${data.isTyping ? 'started' : 'stopped'} typing in conversation ${data.conversationId}`,
    );

    return { success: true };
  }

  /**
   * Join a conversation room
   * Clients should join conversation rooms to receive typing indicators
   */
  @SubscribeMessage('joinConversation')
  @UseGuards(WsJwtGuard)
  handleJoinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.join(`conversation:${conversationId}`);
    this.logger.log(
      `Client ${client.id} joined conversation ${conversationId}`,
    );
    return { success: true, conversationId };
  }

  /**
   * Leave a conversation room
   */
  @SubscribeMessage('leaveConversation')
  @UseGuards(WsJwtGuard)
  handleLeaveConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() conversationId: string,
  ) {
    client.leave(`conversation:${conversationId}`);
    this.logger.log(`Client ${client.id} left conversation ${conversationId}`);
    return { success: true };
  }

  /**
   * Emit new message to user
   */
  emitMessageToUser(userId: string, message: any) {
    this.server.to(`user:${userId}`).emit('message', message);
    this.logger.log(`Emitted message to user:${userId}`);
  }

  /**
   * Emit message read status update
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
   * Emit conversation read status update
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
   * Emit message deletion
   */
  /**
   * Emit message update to a user
   */
  emitMessageUpdated(userId: string, message: any) {
    this.server.to(`user:${userId}`).emit('messageUpdated', message);
    this.logger.log(
      `Emitted message updated to user:${userId}, messageId:${message.id}`,
    );
  }

  /**
   * Emit message deletion to a user
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
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    const sockets = this.userSockets.get(userId);
    return sockets !== undefined && sockets.size > 0;
  }

  /**
   * Get number of active connections for a user
   */
  getUserConnectionCount(userId: string): number {
    return this.userSockets.get(userId)?.size || 0;
  }
}

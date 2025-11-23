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
import { SupportChatService } from './support-chat.service';

@WebSocketGateway({
  namespace: 'support',
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class SupportChatGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(SupportChatGateway.name);
  private userSockets = new Map<string, string>(); // userId -> socketId

  constructor(private supportChatService: SupportChatService) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // Remove from userSockets map
    for (const [userId, socketId] of this.userSockets.entries()) {
      if (socketId === client.id) {
        this.userSockets.delete(userId);
        break;
      }
    }
  }

  /**
   * User joins support chat system
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('support:join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    this.userSockets.set(data.userId, client.id);
    client.join(`user:${data.userId}`);

    this.logger.log(`User ${data.userId} joined support system`);

    return { success: true };
  }

  /**
   * Join a specific chat room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('support:joinChat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    client.join(`chat:${data.chatId}`);
    this.logger.log(`Client ${client.id} joined chat ${data.chatId}`);

    return { success: true, chatId: data.chatId };
  }

  /**
   * Leave a specific chat room
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('support:leaveChat')
  handleLeaveChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string },
  ) {
    client.leave(`chat:${data.chatId}`);
    this.logger.log(`Client ${client.id} left chat ${data.chatId}`);

    return { success: true };
  }

  /**
   * User is typing indicator
   */
  @UseGuards(WsJwtGuard)
  @SubscribeMessage('support:typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { chatId: string; username: string },
  ) {
    client.to(`chat:${data.chatId}`).emit('support:userTyping', {
      chatId: data.chatId,
      username: data.username,
    });
  }

  /**
   * Emit new message to chat participants
   */
  emitMessage(chatId: string, message: any) {
    this.server.to(`chat:${chatId}`).emit('support:newMessage', {
      chatId,
      message,
    });
  }

  /**
   * Emit chat assigned to agent
   */
  emitChatAssigned(chatId: string, agentId: string, userId: string) {
    // Notify user
    this.server.to(`user:${userId}`).emit('support:chatAssigned', {
      chatId,
      agentId,
    });

    // Notify agent
    this.server.to(`user:${agentId}`).emit('support:newChatAssigned', {
      chatId,
      userId,
    });

    this.logger.log(`Chat ${chatId} assigned notification sent`);
  }

  /**
   * Emit queue position update
   */
  emitQueuePositionUpdate(userId: string, chatId: string, position: number) {
    this.server.to(`user:${userId}`).emit('support:queueUpdate', {
      chatId,
      position,
    });
  }

  /**
   * Emit chat resolved
   */
  emitChatResolved(chatId: string) {
    this.server.to(`chat:${chatId}`).emit('support:chatResolved', {
      chatId,
    });

    this.logger.log(`Chat ${chatId} resolved notification sent`);
  }

  /**
   * Emit chat closed
   */
  emitChatClosed(chatId: string) {
    this.server.to(`chat:${chatId}`).emit('support:chatClosed', {
      chatId,
    });

    this.logger.log(`Chat ${chatId} closed notification sent`);
  }

  /**
   * Emit agent availability change
   */
  emitAgentAvailability(agentId: string, isAvailable: boolean) {
    this.server.emit('support:agentAvailability', {
      agentId,
      isAvailable,
    });
  }
}

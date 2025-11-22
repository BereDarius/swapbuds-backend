import { CacheService } from '@/cache/cache.service';
import { NotificationsGateway } from '@/notifications/gateway/notifications.gateway';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConversationResponseDto } from './dto/conversation-response.dto';
import { GetMessagesDto } from './dto/get-messages.dto';
import { MessageResponseDto } from './dto/message-response.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway,
    private notificationsService: NotificationsService,
    private cacheService: CacheService,
  ) {}

  /**
   * Send a message to another user
   * Creates conversation if it doesn't exist
   */
  async sendMessage(
    senderId: string,
    dto: SendMessageDto,
  ): Promise<MessageResponseDto> {
    // Validate recipient exists
    const recipient = await this.prisma.user.findUnique({
      where: { id: dto.recipientId },
    });

    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    if (senderId === dto.recipientId) {
      throw new BadRequestException('Cannot send message to yourself');
    }

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(
      senderId,
      dto.recipientId,
      dto.tradeId,
    );

    // Create message
    const message = await this.prisma.message.create({
      data: {
        content: dto.content,
        type: dto.type || 'text',
        senderId,
        conversationId: conversation.id,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Update conversation last message info
    await this.prisma.conversation.update({
      where: { id: conversation.id },
      data: {
        lastMessageAt: new Date(),
        lastMessageContent: dto.content.substring(0, 100), // Preview
        lastMessageSender: senderId,
      },
    });

    const formattedMessage = this.formatMessageResponse(message);

    // Invalidate unread count cache for the recipient
    await this.cacheService.del(
      this.cacheService.getUnreadMessagesKey(dto.recipientId),
    );

    // Emit real-time message to recipient
    this.notificationsGateway.emitMessageToUser(
      dto.recipientId,
      formattedMessage,
    );

    // Create notification for recipient (respects their preferences)
    await this.notificationsService.createNotification({
      type: 'NEW_MESSAGE',
      title: `New message from ${message.sender.username}`,
      message: dto.content.substring(0, 100), // Preview
      userId: dto.recipientId,
      metadata: {
        messageId: message.id,
        conversationId: conversation.id,
        senderId,
        senderUsername: message.sender.username,
      },
    });

    return formattedMessage;
  }

  /**
   * Get all conversations for a user
   */
  async getConversations(userId: string): Promise<ConversationResponseDto[]> {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      include: {
        user1: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        user2: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
            isActive: true,
          },
        },
        trade: {
          select: {
            id: true,
            status: true,
            itemOffered: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
            itemRequested: {
              select: {
                id: true,
                title: true,
                images: true,
              },
            },
          },
        },
        messages: {
          where: {
            isRead: false,
            senderId: { not: userId }, // Count unread from other user
          },
          select: { id: true },
        },
      },
      orderBy: {
        lastMessageAt: 'desc',
      },
    });

    return conversations.map((conv) => {
      const otherUser = conv.user1Id === userId ? conv.user2 : conv.user1;
      return {
        id: conv.id,
        user1Id: conv.user1Id,
        user2Id: conv.user2Id,
        tradeId: conv.tradeId,
        lastMessageAt: conv.lastMessageAt,
        lastMessageContent: conv.lastMessageContent,
        lastMessageSender: conv.lastMessageSender,
        unreadCount: conv.messages.length,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
        otherUser,
        trade: conv.trade || undefined,
      };
    });
  }

  /**
   * Get messages in a conversation
   */
  async getMessages(
    userId: string,
    conversationId: string,
    dto: GetMessagesDto,
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    // Verify user is part of the conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    const page = dto.page || 1;
    const limit = dto.limit || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: {
          conversationId,
          isDeleted: false,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: {
          conversationId,
          isDeleted: false,
        },
      }),
    ]);

    return {
      messages: messages.map((m) => this.formatMessageResponse(m)),
      total,
    };
  }

  /**
   * Mark message as read
   */
  async markAsRead(
    userId: string,
    messageId: string,
  ): Promise<MessageResponseDto> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Verify user is the recipient
    if (
      message.conversation.user1Id !== userId &&
      message.conversation.user2Id !== userId
    ) {
      throw new ForbiddenException('You cannot mark this message as read');
    }

    // Don't mark own messages as read
    if (message.senderId === userId) {
      return this.formatMessageResponse(message);
    }

    const updatedMessage = await this.prisma.message.update({
      where: { id: messageId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
    });

    const formattedMessage = this.formatMessageResponse(updatedMessage);

    // Invalidate unread count cache for the recipient
    await this.cacheService.del(this.cacheService.getUnreadMessagesKey(userId));

    // Emit real-time read status to sender
    this.notificationsGateway.emitMessageRead(
      message.senderId,
      messageId,
      message.conversationId,
    );

    return formattedMessage;
  }

  /**
   * Mark all messages in a conversation as read
   */
  async markConversationAsRead(
    userId: string,
    conversationId: string,
  ): Promise<{ count: number }> {
    // Verify user is part of the conversation
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      throw new ForbiddenException(
        'You do not have access to this conversation',
      );
    }

    const result = await this.prisma.message.updateMany({
      where: {
        conversationId,
        senderId: { not: userId }, // Only mark other user's messages
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    // Emit real-time read status to other user
    const otherUserId =
      conversation.user1Id === userId
        ? conversation.user2Id
        : conversation.user1Id;
    this.notificationsGateway.emitConversationRead(
      otherUserId,
      conversationId,
      result.count,
    );

    return { count: result.count };
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(userId: string, messageId: string): Promise<void> {
    const message = await this.prisma.message.findUnique({
      where: { id: messageId },
      include: {
        conversation: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.message.update({
      where: { id: messageId },
      data: { isDeleted: true },
    });

    // Emit deletion to other user
    const otherUserId =
      message.conversation.user1Id === userId
        ? message.conversation.user2Id
        : message.conversation.user1Id;
    this.notificationsGateway.emitMessageDeleted(
      otherUserId,
      messageId,
      message.conversationId,
    );
  }

  /**
   * Get unread message count for a user (with Redis caching)
   */
  async getUnreadCount(userId: string): Promise<number> {
    // Try cache first
    const cacheKey = this.cacheService.getUnreadMessagesKey(userId);
    const cached = await this.cacheService.get<number>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    // Fetch from database if not cached
    const conversations = await this.prisma.conversation.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
      },
      select: { id: true },
    });

    const conversationIds = conversations.map((c) => c.id);

    const count = await this.prisma.message.count({
      where: {
        conversationId: { in: conversationIds },
        senderId: { not: userId },
        isRead: false,
        isDeleted: false,
      },
    });

    // Cache the result for 1 minute
    await this.cacheService.set(cacheKey, count, 60000);

    return count;
  }

  /**
   * Get or create a conversation between two users
   */
  private async getOrCreateConversation(
    user1Id: string,
    user2Id: string,
    tradeId?: string,
  ) {
    // Normalize user IDs (smaller ID first)
    const [smallerId, largerId] = [user1Id, user2Id].sort();

    // Try to find existing conversation
    let conversation = await this.prisma.conversation.findFirst({
      where: {
        user1Id: smallerId,
        user2Id: largerId,
      },
    });

    if (!conversation) {
      // Create new conversation
      conversation = await this.prisma.conversation.create({
        data: {
          user1Id: smallerId,
          user2Id: largerId,
          tradeId,
        },
      });
    }

    return conversation;
  }

  /**
   * Format message response
   */
  private formatMessageResponse(message: any): MessageResponseDto {
    return {
      id: message.id,
      content: message.content,
      type: message.type,
      senderId: message.senderId,
      conversationId: message.conversationId,
      isRead: message.isRead,
      readAt: message.readAt,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: message.sender,
    };
  }
}

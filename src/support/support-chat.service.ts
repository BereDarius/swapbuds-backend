import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupportChatStatus, SupportPriority, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SupportQueueService } from './support-queue.service';

export interface CreateChatDto {
  subject: string;
  priority?: SupportPriority;
  initialMessage: string;
}

export interface SendMessageDto {
  message: string;
}

export interface ResolveChatDto {
  resolution?: string;
}

@Injectable()
export class SupportChatService {
  constructor(
    private prisma: PrismaService,
    private queueService: SupportQueueService,
  ) {}

  /**
   * Create a new support chat
   */
  async createChat(userId: string, dto: CreateChatDto) {
    // Check if user already has an active or waiting chat
    const existingChat = await this.prisma.supportChat.findFirst({
      where: {
        userId,
        status: {
          in: [SupportChatStatus.WAITING, SupportChatStatus.ACTIVE],
        },
      },
    });

    if (existingChat) {
      throw new BadRequestException(
        'You already have an active support chat. Please close it before starting a new one.',
      );
    }

    // Determine priority (verified users get higher priority)
    let priority = dto.priority || SupportPriority.MEDIUM;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { isVerified: true },
    });

    if (user?.isVerified && priority === SupportPriority.MEDIUM) {
      priority = SupportPriority.HIGH;
    }

    // Create the chat
    const chat = await this.prisma.supportChat.create({
      data: {
        userId,
        subject: dto.subject,
        priority,
        status: SupportChatStatus.WAITING,
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
          },
        },
      },
    });

    // Add initial message
    await this.prisma.supportMessage.create({
      data: {
        chatId: chat.id,
        senderId: userId,
        message: dto.initialMessage,
      },
    });

    // Add to queue
    const queuePosition = await this.queueService.addToQueue(chat.id);

    // Try auto-assignment
    await this.queueService.autoAssignChats();

    return {
      ...chat,
      queuePosition,
    };
  }

  /**
   * Get chat details
   */
  async getChat(chatId: string, userId: string, userRole: UserRole) {
    const chat = await this.prisma.supportChat.findUnique({
      where: { id: chatId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
          },
        },
        agent: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'asc' },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check access permissions
    const isUser = chat.userId === userId;
    const isAgent = chat.agentId === userId;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPPORT;

    if (!isUser && !isAgent && !isAdmin) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    return chat;
  }

  /**
   * Get user's chats
   */
  async getUserChats(userId: string, includeResolved: boolean = false) {
    const where: any = { userId };

    if (!includeResolved) {
      where.status = {
        in: [SupportChatStatus.WAITING, SupportChatStatus.ACTIVE],
      };
    }

    return this.prisma.supportChat.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        agent: {
          select: {
            id: true,
            username: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Last message only
          select: {
            message: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Get agent's assigned chats
   */
  async getAgentChats(agentId: string) {
    return this.prisma.supportChat.findMany({
      where: {
        agentId,
        status: SupportChatStatus.ACTIVE,
      },
      orderBy: { startedAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            isVerified: true,
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            message: true,
            createdAt: true,
          },
        },
      },
    });
  }

  /**
   * Send a message in a chat
   */
  async sendMessage(
    chatId: string,
    userId: string,
    dto: SendMessageDto,
    userRole: UserRole,
  ) {
    const chat = await this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        userId: true,
        agentId: true,
        status: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check if user has access to this chat
    const isUser = chat.userId === userId;
    const isAgent = chat.agentId === userId;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPPORT;

    if (!isUser && !isAgent && !isAdmin) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    // Check if chat is active
    if (
      chat.status !== SupportChatStatus.ACTIVE &&
      chat.status !== SupportChatStatus.WAITING
    ) {
      throw new BadRequestException('Cannot send messages to a closed chat');
    }

    const message = await this.prisma.supportMessage.create({
      data: {
        chatId,
        senderId: userId,
        message: dto.message,
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    return message;
  }

  /**
   * Resolve a chat
   */
  async resolveChat(chatId: string, agentId: string, dto: ResolveChatDto) {
    const chat = await this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        agentId: true,
        status: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    if (chat.agentId !== agentId) {
      throw new ForbiddenException('You are not assigned to this chat');
    }

    if (chat.status !== SupportChatStatus.ACTIVE) {
      throw new BadRequestException('Can only resolve active chats');
    }

    // Update chat status
    const updatedChat = await this.prisma.supportChat.update({
      where: { id: chatId },
      data: {
        status: SupportChatStatus.RESOLVED,
        resolvedAt: new Date(),
      },
      include: {
        user: true,
        agent: true,
      },
    });

    // Add system message if resolution note provided
    if (dto.resolution) {
      await this.prisma.supportMessage.create({
        data: {
          chatId,
          senderId: agentId,
          message: `Chat resolved: ${dto.resolution}`,
          isSystem: true,
        },
      });
    }

    return updatedChat;
  }

  /**
   * Close a chat (by user or agent)
   */
  async closeChat(chatId: string, userId: string, userRole: UserRole) {
    const chat = await this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: {
        id: true,
        userId: true,
        agentId: true,
        status: true,
      },
    });

    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    // Check permissions
    const isUser = chat.userId === userId;
    const isAgent = chat.agentId === userId;
    const isAdmin =
      userRole === UserRole.ADMIN || userRole === UserRole.SUPPORT;

    if (!isUser && !isAgent && !isAdmin) {
      throw new ForbiddenException('You do not have access to this chat');
    }

    // If in queue, remove from queue
    if (chat.status === SupportChatStatus.WAITING) {
      await this.queueService.removeFromQueue(chatId);
    }

    // Update chat status
    const updatedChat = await this.prisma.supportChat.update({
      where: { id: chatId },
      data: {
        status: SupportChatStatus.CLOSED,
        closedAt: new Date(),
      },
    });

    // Add system message
    await this.prisma.supportMessage.create({
      data: {
        chatId,
        senderId: userId,
        message: 'Chat closed',
        isSystem: true,
      },
    });

    return updatedChat;
  }

  /**
   * Get support statistics
   */
  async getSupportStats() {
    const [totalChats, activeChats, waitingChats, resolvedChats, queueStats] =
      await Promise.all([
        this.prisma.supportChat.count(),
        this.prisma.supportChat.count({
          where: { status: SupportChatStatus.ACTIVE },
        }),
        this.prisma.supportChat.count({
          where: { status: SupportChatStatus.WAITING },
        }),
        this.prisma.supportChat.count({
          where: { status: SupportChatStatus.RESOLVED },
        }),
        this.queueService.getQueueStats(),
      ]);

    return {
      total: totalChats,
      active: activeChats,
      waiting: waitingChats,
      resolved: resolvedChats,
      queue: queueStats,
    };
  }
}

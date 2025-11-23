import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { SupportChatStatus, SupportPriority, UserRole } from '@prisma/client';

@Injectable()
export class SupportQueueService {
  private readonly logger = new Logger(SupportQueueService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Add a chat to the queue and calculate its position
   */
  async addToQueue(chatId: string): Promise<number> {
    const chat = await this.prisma.supportChat.findUnique({
      where: { id: chatId },
      select: { priority: true },
    });

    if (!chat) {
      throw new Error('Chat not found');
    }

    // Count chats ahead in queue with same or higher priority
    const position = await this.calculateQueuePosition(chat.priority);

    // Update chat with queue position
    await this.prisma.supportChat.update({
      where: { id: chatId },
      data: {
        queuePosition: position,
        status: SupportChatStatus.WAITING,
      },
    });

    this.logger.log(
      `Chat ${chatId} added to queue at position ${position} (priority: ${chat.priority})`,
    );

    return position;
  }

  /**
   * Calculate queue position based on priority
   */
  async calculateQueuePosition(priority: SupportPriority): Promise<number> {
    const priorityOrder = {
      [SupportPriority.CRITICAL]: 0,
      [SupportPriority.HIGH]: 1,
      [SupportPriority.MEDIUM]: 2,
      [SupportPriority.LOW]: 3,
    };

    const currentPriorityValue = priorityOrder[priority];

    // Count all waiting chats with higher or equal priority
    const chatsAhead = await this.prisma.supportChat.count({
      where: {
        status: SupportChatStatus.WAITING,
        priority: {
          in: Object.keys(priorityOrder)
            .filter(
              (p) =>
                priorityOrder[p as SupportPriority] <= currentPriorityValue,
            )
            .map((p) => p as SupportPriority),
        },
      },
    });

    return chatsAhead + 1;
  }

  /**
   * Get next chat from queue for an agent
   */
  async getNextChatFromQueue(): Promise<string | null> {
    // Get highest priority chat with lowest queue position
    const nextChat = await this.prisma.supportChat.findFirst({
      where: {
        status: SupportChatStatus.WAITING,
      },
      orderBy: [
        { priority: 'desc' }, // Higher priority first (CRITICAL > HIGH > MEDIUM > LOW)
        { queuePosition: 'asc' }, // Lower position first
        { createdAt: 'asc' }, // Older first
      ],
      select: { id: true },
    });

    return nextChat?.id || null;
  }

  /**
   * Assign chat to an agent
   */
  async assignChatToAgent(chatId: string, agentId: string): Promise<void> {
    await this.prisma.supportChat.update({
      where: { id: chatId },
      data: {
        agentId,
        status: SupportChatStatus.ACTIVE,
        startedAt: new Date(),
        queuePosition: null, // Remove from queue
      },
    });

    // Recalculate positions for remaining chats
    await this.recalculateQueuePositions();

    this.logger.log(`Chat ${chatId} assigned to agent ${agentId}`);
  }

  /**
   * Remove chat from queue (cancelled or resolved)
   */
  async removeFromQueue(chatId: string): Promise<void> {
    await this.prisma.supportChat.update({
      where: { id: chatId },
      data: {
        queuePosition: null,
      },
    });

    // Recalculate positions for remaining chats
    await this.recalculateQueuePositions();

    this.logger.log(`Chat ${chatId} removed from queue`);
  }

  /**
   * Recalculate queue positions after a chat is removed or assigned
   */
  async recalculateQueuePositions(): Promise<void> {
    const waitingChats = await this.prisma.supportChat.findMany({
      where: {
        status: SupportChatStatus.WAITING,
      },
      orderBy: [
        { priority: 'desc' },
        { queuePosition: 'asc' },
        { createdAt: 'asc' },
      ],
      select: { id: true },
    });

    // Update positions sequentially
    for (let i = 0; i < waitingChats.length; i++) {
      await this.prisma.supportChat.update({
        where: { id: waitingChats[i].id },
        data: { queuePosition: i + 1 },
      });
    }
  }

  /**
   * Get available support agents (SUPPORT role or ADMIN)
   */
  async getAvailableAgents(): Promise<string[]> {
    const agents = await this.prisma.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [UserRole.SUPPORT, UserRole.ADMIN],
        },
      },
      select: { id: true },
    });

    // Filter agents who don't have active chats or have fewer than max concurrent chats
    const availableAgents: string[] = [];

    for (const agent of agents) {
      const activeChats = await this.prisma.supportChat.count({
        where: {
          agentId: agent.id,
          status: SupportChatStatus.ACTIVE,
        },
      });

      // Allow up to 3 concurrent chats per agent
      if (activeChats < 3) {
        availableAgents.push(agent.id);
      }
    }

    return availableAgents;
  }

  /**
   * Auto-assign waiting chats to available agents
   */
  async autoAssignChats(): Promise<number> {
    const availableAgents = await this.getAvailableAgents();

    if (availableAgents.length === 0) {
      return 0;
    }

    let assignedCount = 0;
    let agentIndex = 0;

    // Keep assigning until no more chats or no more capacity
    while (true) {
      const nextChatId = await this.getNextChatFromQueue();

      if (!nextChatId) {
        break; // No more chats in queue
      }

      const agentId = availableAgents[agentIndex % availableAgents.length];

      await this.assignChatToAgent(nextChatId, agentId);
      assignedCount++;

      // Update available agents list after assignment
      const updatedAgents = await this.getAvailableAgents();
      if (updatedAgents.length === 0) {
        break; // No more capacity
      }

      agentIndex++;
    }

    if (assignedCount > 0) {
      this.logger.log(`Auto-assigned ${assignedCount} chats to agents`);
    }

    return assignedCount;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats() {
    const [total, byPriority, averageWaitTime] = await Promise.all([
      this.prisma.supportChat.count({
        where: { status: SupportChatStatus.WAITING },
      }),
      this.prisma.supportChat.groupBy({
        by: ['priority'],
        where: { status: SupportChatStatus.WAITING },
        _count: { id: true },
      }),
      this.getAverageWaitTime(),
    ]);

    return {
      total,
      byPriority: byPriority.map((item) => ({
        priority: item.priority,
        count: item._count.id,
      })),
      averageWaitTime,
    };
  }

  /**
   * Get average wait time in minutes
   */
  async getAverageWaitTime(): Promise<number> {
    const recentResolvedChats = await this.prisma.supportChat.findMany({
      where: {
        status: SupportChatStatus.RESOLVED,
        startedAt: { not: null },
      },
      select: {
        createdAt: true,
        startedAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50, // Last 50 resolved chats
    });

    if (recentResolvedChats.length === 0) {
      return 0;
    }

    const totalWaitTime = recentResolvedChats.reduce((sum, chat) => {
      if (!chat.startedAt) return sum;
      const waitTime = chat.startedAt.getTime() - chat.createdAt.getTime();
      return sum + waitTime;
    }, 0);

    return Math.round(totalWaitTime / recentResolvedChats.length / 60000); // Convert to minutes
  }
}

import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { SupportChatStatus, SupportPriority, UserRole } from '@prisma/client';
import { SupportQueueService } from './support-queue.service';

describe('SupportQueueService', () => {
  let service: SupportQueueService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportQueueService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<SupportQueueService>(SupportQueueService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addToQueue', () => {
    it('should add a chat to queue and return position', async () => {
      const chatId = 'chat-1';
      const mockChat = {
        id: chatId,
        priority: SupportPriority.MEDIUM,
      };

      mockPrismaService.supportChat.findUnique.mockResolvedValue(mockChat);
      mockPrismaService.supportChat.count.mockResolvedValue(2); // 2 chats ahead
      mockPrismaService.supportChat.update.mockResolvedValue({
        ...mockChat,
        queuePosition: 3,
      });

      const position = await service.addToQueue(chatId);

      expect(position).toBe(3);
      expect(mockPrismaService.supportChat.update).toHaveBeenCalledWith({
        where: { id: chatId },
        data: {
          queuePosition: 3,
          status: SupportChatStatus.WAITING,
        },
      });
    });

    it('should throw error if chat not found', async () => {
      mockPrismaService.supportChat.findUnique.mockResolvedValue(null);

      await expect(service.addToQueue('non-existent')).rejects.toThrow(
        'Chat not found',
      );
    });
  });

  describe('calculateQueuePosition', () => {
    it('should calculate position for CRITICAL priority', async () => {
      mockPrismaService.supportChat.count.mockResolvedValue(2);

      const position = await service.calculateQueuePosition(
        SupportPriority.CRITICAL,
      );

      expect(position).toBe(3);
    });

    it('should calculate position for MEDIUM priority', async () => {
      mockPrismaService.supportChat.count.mockResolvedValue(5);

      const position = await service.calculateQueuePosition(
        SupportPriority.MEDIUM,
      );

      expect(position).toBe(6);
    });

    it('should return 1 if no chats waiting', async () => {
      mockPrismaService.supportChat.count.mockResolvedValue(0);

      const position = await service.calculateQueuePosition(
        SupportPriority.LOW,
      );

      expect(position).toBe(1);
    });
  });

  describe('getNextChatFromQueue', () => {
    it('should return highest priority chat', async () => {
      const mockChat = { id: 'chat-1' };

      mockPrismaService.supportChat.findFirst.mockResolvedValue(mockChat);

      const result = await service.getNextChatFromQueue();

      expect(result).toBe('chat-1');
      expect(mockPrismaService.supportChat.findFirst).toHaveBeenCalledWith({
        where: { status: SupportChatStatus.WAITING },
        orderBy: [
          { priority: 'desc' },
          { queuePosition: 'asc' },
          { createdAt: 'asc' },
        ],
        select: { id: true },
      });
    });

    it('should return null if no chats in queue', async () => {
      mockPrismaService.supportChat.findFirst.mockResolvedValue(null);

      const result = await service.getNextChatFromQueue();

      expect(result).toBeNull();
    });
  });

  describe('assignChatToAgent', () => {
    it('should assign chat to agent and recalculate positions', async () => {
      const chatId = 'chat-1';
      const agentId = 'agent-1';

      mockPrismaService.supportChat.update.mockResolvedValue({});
      mockPrismaService.supportChat.findMany.mockResolvedValue([]);

      await service.assignChatToAgent(chatId, agentId);

      expect(mockPrismaService.supportChat.update).toHaveBeenCalledWith({
        where: { id: chatId },
        data: {
          agentId,
          status: SupportChatStatus.ACTIVE,
          startedAt: expect.any(Date),
          queuePosition: null,
        },
      });
    });
  });

  describe('removeFromQueue', () => {
    it('should remove chat from queue and recalculate', async () => {
      const chatId = 'chat-1';

      mockPrismaService.supportChat.update.mockResolvedValue({});
      mockPrismaService.supportChat.findMany.mockResolvedValue([]);

      await service.removeFromQueue(chatId);

      expect(mockPrismaService.supportChat.update).toHaveBeenCalledWith({
        where: { id: chatId },
        data: { queuePosition: null },
      });
    });
  });

  describe('recalculateQueuePositions', () => {
    it('should update positions for all waiting chats', async () => {
      const mockChats = [{ id: 'chat-1' }, { id: 'chat-2' }, { id: 'chat-3' }];

      mockPrismaService.supportChat.findMany.mockResolvedValue(mockChats);
      mockPrismaService.supportChat.update.mockResolvedValue({});

      await service.recalculateQueuePositions();

      expect(mockPrismaService.supportChat.update).toHaveBeenCalledTimes(3);
      expect(mockPrismaService.supportChat.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'chat-1' },
        data: { queuePosition: 1 },
      });
      expect(mockPrismaService.supportChat.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'chat-2' },
        data: { queuePosition: 2 },
      });
    });
  });

  describe('getAvailableAgents', () => {
    it('should return agents with less than 3 active chats', async () => {
      const mockAgents = [
        { id: 'agent-1' },
        { id: 'agent-2' },
        { id: 'agent-3' },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(mockAgents);
      mockPrismaService.supportChat.count
        .mockResolvedValueOnce(2) // agent-1: 2 chats
        .mockResolvedValueOnce(3) // agent-2: 3 chats (at limit)
        .mockResolvedValueOnce(1); // agent-3: 1 chat

      const result = await service.getAvailableAgents();

      expect(result).toEqual(['agent-1', 'agent-3']);
    });

    it('should return empty array if no agents available', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const result = await service.getAvailableAgents();

      expect(result).toEqual([]);
    });

    it('should only include SUPPORT and ADMIN roles', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.getAvailableAgents();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          role: {
            in: [UserRole.SUPPORT, UserRole.ADMIN],
          },
        },
        select: { id: true },
      });
    });
  });

  describe('autoAssignChats', () => {
    it('should assign multiple chats to available agents', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([
        { id: 'agent-1' },
        { id: 'agent-2' },
      ]);
      mockPrismaService.supportChat.count.mockResolvedValue(0);
      mockPrismaService.supportChat.findFirst
        .mockResolvedValueOnce({ id: 'chat-1' })
        .mockResolvedValueOnce({ id: 'chat-2' })
        .mockResolvedValueOnce(null);
      mockPrismaService.supportChat.update.mockResolvedValue({});
      mockPrismaService.supportChat.findMany.mockResolvedValue([]);

      const count = await service.autoAssignChats();

      expect(count).toBe(2);
    });

    it('should return 0 if no agents available', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      const count = await service.autoAssignChats();

      expect(count).toBe(0);
    });

    it('should return 0 if no chats in queue', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 'agent-1' }]);
      mockPrismaService.supportChat.count.mockResolvedValue(0);
      mockPrismaService.supportChat.findFirst.mockResolvedValue(null);

      const count = await service.autoAssignChats();

      expect(count).toBe(0);
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      const mockGroupBy = [
        { priority: SupportPriority.HIGH, _count: { id: 3 } },
        { priority: SupportPriority.MEDIUM, _count: { id: 5 } },
      ];

      const mockResolvedChats = [
        {
          createdAt: new Date('2025-01-01T10:00:00Z'),
          startedAt: new Date('2025-01-01T10:05:00Z'),
        },
        {
          createdAt: new Date('2025-01-01T11:00:00Z'),
          startedAt: new Date('2025-01-01T11:03:00Z'),
        },
      ];

      mockPrismaService.supportChat.count.mockResolvedValue(8);
      mockPrismaService.supportChat.groupBy.mockResolvedValue(mockGroupBy);
      mockPrismaService.supportChat.findMany.mockResolvedValue(
        mockResolvedChats,
      );

      const result = await service.getQueueStats();

      expect(result.total).toBe(8);
      expect(result.byPriority).toEqual([
        { priority: SupportPriority.HIGH, count: 3 },
        { priority: SupportPriority.MEDIUM, count: 5 },
      ]);
      expect(result.averageWaitTime).toBe(4); // (5 + 3) / 2 = 4 minutes
    });
  });

  describe('getAverageWaitTime', () => {
    it('should calculate average wait time in minutes', async () => {
      const mockChats = [
        {
          createdAt: new Date('2025-01-01T10:00:00Z'),
          startedAt: new Date('2025-01-01T10:10:00Z'), // 10 minutes
        },
        {
          createdAt: new Date('2025-01-01T11:00:00Z'),
          startedAt: new Date('2025-01-01T11:05:00Z'), // 5 minutes
        },
      ];

      mockPrismaService.supportChat.findMany.mockResolvedValue(mockChats);

      const result = await service.getAverageWaitTime();

      expect(result).toBe(8); // (10 + 5) / 2 = 7.5, rounded to 8
    });

    it('should return 0 if no resolved chats', async () => {
      mockPrismaService.supportChat.findMany.mockResolvedValue([]);

      const result = await service.getAverageWaitTime();

      expect(result).toBe(0);
    });

    it('should handle chats without startedAt', async () => {
      const mockChats = [
        {
          createdAt: new Date('2025-01-01T10:00:00Z'),
          startedAt: null,
        },
      ];

      mockPrismaService.supportChat.findMany.mockResolvedValue(mockChats);

      const result = await service.getAverageWaitTime();

      expect(result).toBe(0);
    });
  });
});

import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { mockSupportQueueService } from '@/test/mocks/support.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  SupportChat,
  SupportChatStatus,
  SupportPriority,
} from '@prisma/client';
import {
  CreateChatDto,
  ResolveChatDto,
  SendMessageDto,
} from './dto/support-chat.dto';
import { SupportChatService } from './support-chat.service';
import { SupportQueueService } from './support-queue.service';

describe('SupportChatService', () => {
  let service: SupportChatService;

  const mockChat: Partial<SupportChat> = {
    id: 'chat-1',
    userId: 'user-1',
    agentId: null,
    status: SupportChatStatus.WAITING,
    priority: SupportPriority.MEDIUM,
    subject: 'Test subject',
    queuePosition: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    startedAt: null,
    resolvedAt: null,
    closedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportChatService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SupportQueueService,
          useValue: mockSupportQueueService,
        },
      ],
    }).compile();

    service = module.get<SupportChatService>(SupportChatService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createChat', () => {
    const createDto: CreateChatDto = {
      subject: 'Need help',
      initialMessage: 'I have a problem',
      priority: SupportPriority.MEDIUM,
    };

    it('should create chat for regular user with MEDIUM priority', async () => {
      mockPrismaService.supportChat.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        isVerified: false,
      });
      mockPrismaService.supportChat.create.mockResolvedValue(mockChat);
      mockPrismaService.supportMessage.create.mockResolvedValue({});
      mockSupportQueueService.addToQueue.mockResolvedValue(1);
      mockSupportQueueService.autoAssignChats.mockResolvedValue(0);

      const result = await service.createChat('user-1', createDto);

      expect(result.id).toBeDefined();
      expect(result.queuePosition).toBe(1);
      expect(mockPrismaService.supportChat.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: SupportPriority.MEDIUM,
          }),
        }),
      );
    });

    it('should boost priority to HIGH for verified users', async () => {
      mockPrismaService.supportChat.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        isVerified: true,
      });
      mockPrismaService.supportChat.create.mockResolvedValue({
        ...mockChat,
        priority: SupportPriority.HIGH,
      });
      mockPrismaService.supportMessage.create.mockResolvedValue({});
      mockSupportQueueService.addToQueue.mockResolvedValue(1);
      mockSupportQueueService.autoAssignChats.mockResolvedValue(0);

      await service.createChat('user-1', createDto);

      expect(mockPrismaService.supportChat.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            priority: SupportPriority.HIGH,
          }),
        }),
      );
    });

    it('should throw error if user already has active chat', async () => {
      mockPrismaService.supportChat.findFirst.mockResolvedValue(mockChat);

      await expect(service.createChat('user-1', createDto)).rejects.toThrow(
        'You already have an active support chat',
      );
    });

    it('should add initial message when provided', async () => {
      mockPrismaService.supportChat.findFirst.mockResolvedValue(null);
      mockPrismaService.user.findUnique.mockResolvedValue({
        isVerified: false,
      });
      mockPrismaService.supportChat.create.mockResolvedValue(mockChat);
      mockPrismaService.supportMessage.create.mockResolvedValue({});
      mockSupportQueueService.addToQueue.mockResolvedValue(1);
      mockSupportQueueService.autoAssignChats.mockResolvedValue(0);

      await service.createChat('user-1', createDto);

      expect(mockPrismaService.supportMessage.create).toHaveBeenCalledWith({
        data: {
          chatId: 'chat-1',
          userSenderId: 'user-1',
          message: 'I have a problem',
        },
      });
    });
  });

  describe('getChat', () => {
    it('should return chat for owner', async () => {
      mockPrismaService.supportChat.findUnique.mockResolvedValue(mockChat);

      const result = await service.getChat('chat-1', 'user-1');

      expect(result).toEqual(mockChat);
    });

    it('should return chat for assigned agent', async () => {
      const assignedChat = { ...mockChat, agentId: 'agent-1' };
      mockPrismaService.supportChat.findUnique.mockResolvedValue(assignedChat);

      const result = await service.getChat('chat-1', 'agent-1');

      expect(result).toEqual(assignedChat);
    });

    it('should throw error if chat not found', async () => {
      mockPrismaService.supportChat.findUnique.mockResolvedValue(null);

      await expect(service.getChat('chat-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if user is not owner or agent', async () => {
      mockPrismaService.supportChat.findUnique.mockResolvedValue(mockChat);

      await expect(service.getChat('chat-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUserChats', () => {
    it('should return user chats without resolved by default', async () => {
      const mockChats = [mockChat];
      mockPrismaService.supportChat.findMany.mockResolvedValue(mockChats);

      const result = await service.getUserChats('user-1');

      expect(result).toEqual(mockChats);
      expect(mockPrismaService.supportChat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [SupportChatStatus.WAITING, SupportChatStatus.ACTIVE],
            },
          }),
        }),
      );
    });

    it('should return all chats including resolved when requested', async () => {
      const mockChats = [mockChat];
      mockPrismaService.supportChat.findMany.mockResolvedValue(mockChats);

      const result = await service.getUserChats('user-1', true);

      expect(result).toEqual(mockChats);
      expect(mockPrismaService.supportChat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.not.objectContaining({
            status: expect.anything(),
          }),
        }),
      );
    });
  });

  describe('getAgentChats', () => {
    it('should return active chats assigned to agent', async () => {
      const assignedChat = { ...mockChat, agentId: 'agent-1' };
      mockPrismaService.supportChat.findMany.mockResolvedValue([assignedChat]);

      const result = await service.getAgentChats('agent-1');

      expect(result).toEqual([assignedChat]);
      expect(mockPrismaService.supportChat.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            agentId: 'agent-1',
            status: SupportChatStatus.ACTIVE,
          },
        }),
      );
    });
  });

  describe('sendMessage', () => {
    const messageDto: SendMessageDto = {
      message: 'Test message',
    };

    it('should send message from user', async () => {
      const activeChat = { ...mockChat, status: SupportChatStatus.ACTIVE };
      mockPrismaService.supportChat.findUnique.mockResolvedValue(activeChat);
      mockPrismaService.supportMessage.create.mockResolvedValue({
        id: 'msg-1',
        chatId: 'chat-1',
        senderId: 'user-1',
        message: 'Test message',
        isSystem: false,
        createdAt: new Date(),
      });

      const result = await service.sendMessage('chat-1', 'user-1', messageDto);

      expect(result).toBeDefined();
      expect(mockPrismaService.supportMessage.create).toHaveBeenCalledWith({
        data: {
          chatId: 'chat-1',
          userSenderId: 'user-1',
          message: 'Test message',
        },
        include: {
          userSender: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });
    });

    it('should throw error if chat is closed', async () => {
      const closedChat = { ...mockChat, status: SupportChatStatus.CLOSED };
      mockPrismaService.supportChat.findUnique.mockResolvedValue(closedChat);

      await expect(
        service.sendMessage('chat-1', 'user-1', messageDto),
      ).rejects.toThrow('Cannot send messages to a closed chat');
    });

    it('should throw error if user lacks permission', async () => {
      mockPrismaService.supportChat.findUnique.mockResolvedValue(mockChat);

      await expect(
        service.sendMessage('chat-1', 'other-user', messageDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('resolveChat', () => {
    const resolveDto: ResolveChatDto = {
      resolution: 'Issue resolved',
    };

    it('should resolve chat by agent', async () => {
      const activeChat = {
        ...mockChat,
        status: SupportChatStatus.ACTIVE,
        agentId: 'agent-1',
      };
      mockPrismaService.supportChat.findUnique.mockResolvedValue(activeChat);
      mockPrismaService.supportChat.update.mockResolvedValue({
        ...activeChat,
        status: SupportChatStatus.RESOLVED,
      });

      const result = await service.resolveChat('chat-1', 'agent-1', resolveDto);

      expect(result.status).toBe(SupportChatStatus.RESOLVED);
      expect(mockPrismaService.supportChat.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: SupportChatStatus.RESOLVED,
            resolvedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('should throw error if agent is not assigned', async () => {
      const unassignedChat = { ...mockChat, agentId: 'other-agent' };
      mockPrismaService.supportChat.findUnique.mockResolvedValue(
        unassignedChat,
      );

      await expect(
        service.resolveChat('chat-1', 'agent-1', resolveDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('closeChat', () => {
    it('should close chat by owner', async () => {
      mockPrismaService.supportChat.findUnique.mockResolvedValue(mockChat);
      mockPrismaService.supportChat.update.mockResolvedValue({
        ...mockChat,
        status: SupportChatStatus.CLOSED,
      });
      mockSupportQueueService.removeFromQueue.mockResolvedValue(undefined);

      const result = await service.closeChat('chat-1', 'user-1');

      expect(result.status).toBe(SupportChatStatus.CLOSED);
      expect(mockSupportQueueService.removeFromQueue).toHaveBeenCalledWith(
        'chat-1',
      );
    });

    it('should close chat by assigned agent', async () => {
      const assignedChat = {
        ...mockChat,
        agentId: 'agent-1',
        status: SupportChatStatus.ACTIVE,
      };
      mockPrismaService.supportChat.findUnique.mockResolvedValue(assignedChat);
      mockPrismaService.supportChat.update.mockResolvedValue({
        ...assignedChat,
        status: SupportChatStatus.CLOSED,
      });
      mockSupportQueueService.removeFromQueue.mockResolvedValue(undefined);

      await service.closeChat('chat-1', 'agent-1');

      expect(mockPrismaService.supportChat.update).toHaveBeenCalled();
    });

    it('should throw error if user lacks permission', async () => {
      mockPrismaService.supportChat.findUnique.mockResolvedValue(mockChat);

      await expect(service.closeChat('chat-1', 'other-user')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getSupportStats', () => {
    it('should return support statistics', async () => {
      mockPrismaService.supportChat.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(25) // active
        .mockResolvedValueOnce(10) // waiting
        .mockResolvedValueOnce(65); // resolved

      mockSupportQueueService.getQueueStats.mockResolvedValue({
        total: 10,
        byPriority: [],
        averageWaitTime: 5,
      });

      const result = await service.getSupportStats();

      expect(result.total).toBe(100);
      expect(result.active).toBe(25);
      expect(result.waiting).toBe(10);
      expect(result.resolved).toBe(65);
      expect(result.queue).toBeDefined();
    });
  });
});

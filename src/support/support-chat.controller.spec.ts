import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { SupportGuard } from '@/auth/guards/support.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { mockSupportChatService } from '@/test/mocks/support.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { SupportChatStatus, SupportPriority, UserRole } from '@prisma/client';
import {
  CreateChatDto,
  ResolveChatDto,
  SendMessageDto,
} from './dto/support-chat.dto';
import { SupportChatController } from './support-chat.controller';
import { SupportChatGateway } from './support-chat.gateway';
import { SupportChatService } from './support-chat.service';

describe('SupportChatController', () => {
  let controller: SupportChatController;

  const mockChat = {
    id: 'chat-1',
    userId: 'user-1',
    agentId: null,
    status: SupportChatStatus.WAITING,
    priority: SupportPriority.MEDIUM,
    subject: 'Test subject',
    queuePosition: 1,
    createdAt: new Date(),
    startedAt: null,
    resolvedAt: null,
    closedAt: null,
  };

  const mockMessage = {
    id: 'msg-1',
    chatId: 'chat-1',
    senderId: 'user-1',
    message: 'Test message',
    isSystem: false,
    createdAt: new Date(),
  };

  const mockSupportChatGateway = {
    emitMessage: jest.fn(),
    emitChatAssigned: jest.fn(),
    emitQueuePositionUpdate: jest.fn(),
    emitChatResolved: jest.fn(),
    emitChatClosed: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SupportChatController],
      providers: [
        {
          provide: SupportChatService,
          useValue: mockSupportChatService,
        },
        {
          provide: SupportChatGateway,
          useValue: mockSupportChatGateway,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(SupportGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<SupportChatController>(SupportChatController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createChat', () => {
    const createDto: CreateChatDto = {
      subject: 'Need help',
      initialMessage: 'I have a problem',
      priority: SupportPriority.MEDIUM,
    };

    const mockRequest = {
      user: {
        id: 'user-1',
        username: 'testuser',
        role: UserRole.USER,
      },
    };

    it('should create chat and emit queue position', async () => {
      mockSupportChatService.createChat.mockResolvedValue(mockChat);

      mockSupportChatService.createChat.mockResolvedValue(mockChat);

      const result = await controller.createChat(createDto, mockRequest as any);

      expect(result).toEqual(mockChat);
      expect(mockSupportChatService.createChat).toHaveBeenCalledWith(
        'user-1',
        createDto,
      );
      expect(
        mockSupportChatGateway.emitQueuePositionUpdate,
      ).toHaveBeenCalledWith('user-1', mockChat.id, mockChat.queuePosition);
    });
  });

  describe('getUserChats', () => {
    const mockRequest = {
      user: { id: 'user-1', username: 'testuser' },
    };

    it('should return user chats without resolved by default', async () => {
      const mockChats = [mockChat];
      mockSupportChatService.getUserChats.mockResolvedValue(mockChats);

      const result = await controller.getUserChats(
        mockRequest as any,
        undefined,
      );

      expect(result).toEqual(mockChats);
      expect(mockSupportChatService.getUserChats).toHaveBeenCalledWith(
        'user-1',
        false,
      );
    });

    it('should return all chats including resolved when requested', async () => {
      const mockChats = [mockChat];
      mockSupportChatService.getUserChats.mockResolvedValue(mockChats);

      const result = await controller.getUserChats(mockRequest as any, 'true');

      expect(result).toEqual(mockChats);
      expect(mockSupportChatService.getUserChats).toHaveBeenCalledWith(
        'user-1',
        true,
      );
    });
  });

  describe('getChat', () => {
    const mockRequest = {
      user: { id: 'user-1', role: UserRole.USER },
    };

    it('should return chat details', async () => {
      mockSupportChatService.getChat.mockResolvedValue(mockChat);

      const result = await controller.getChat('chat-1', mockRequest as any);

      expect(result).toEqual(mockChat);
      expect(mockSupportChatService.getChat).toHaveBeenCalledWith(
        'chat-1',
        'user-1',
        UserRole.USER,
      );
    });
  });

  describe('sendMessage', () => {
    const messageDto: SendMessageDto = {
      message: 'Test message',
    };

    const mockRequest = {
      user: { id: 'user-1', role: UserRole.USER },
    };

    it('should send message and emit via WebSocket', async () => {
      mockSupportChatService.sendMessage.mockResolvedValue(mockMessage);

      const result = await controller.sendMessage(
        'chat-1',
        messageDto,
        mockRequest as any,
      );

      expect(result).toEqual(mockMessage);
      expect(mockSupportChatService.sendMessage).toHaveBeenCalledWith(
        'chat-1',
        'user-1',
        messageDto,
        UserRole.USER,
      );
      expect(mockSupportChatGateway.emitMessage).toHaveBeenCalledWith(
        'chat-1',
        mockMessage,
      );
    });
  });

  describe('closeChat', () => {
    const mockRequest = {
      user: { id: 'user-1', role: UserRole.USER },
    };

    it('should close chat and emit via WebSocket', async () => {
      const closedChat = { ...mockChat, status: SupportChatStatus.CLOSED };
      mockSupportChatService.closeChat.mockResolvedValue(closedChat);

      const result = await controller.closeChat('chat-1', mockRequest as any);

      expect(result).toEqual(closedChat);
      expect(mockSupportChatService.closeChat).toHaveBeenCalledWith(
        'chat-1',
        'user-1',
        UserRole.USER,
      );
      expect(mockSupportChatGateway.emitChatClosed).toHaveBeenCalledWith(
        'chat-1',
      );
    });
  });

  describe('getAgentChats', () => {
    const mockRequest = {
      user: { id: 'agent-1', role: UserRole.SUPPORT },
    };

    it('should return agent chats', async () => {
      const mockChats = [mockChat];
      mockSupportChatService.getAgentChats.mockResolvedValue(mockChats);

      const result = await controller.getAgentChats(mockRequest as any);

      expect(result).toEqual(mockChats);
      expect(mockSupportChatService.getAgentChats).toHaveBeenCalledWith(
        'agent-1',
      );
    });
  });

  describe('resolveChat', () => {
    const resolveDto: ResolveChatDto = {
      resolution: 'Issue resolved',
    };

    const mockRequest = {
      user: { id: 'agent-1', role: UserRole.SUPPORT },
    };

    it('should resolve chat and emit via WebSocket', async () => {
      const resolvedChat = {
        ...mockChat,
        status: SupportChatStatus.RESOLVED,
        agentId: 'agent-1',
      };
      mockSupportChatService.resolveChat.mockResolvedValue(resolvedChat);

      const result = await controller.resolveChat(
        'chat-1',
        resolveDto,
        mockRequest as any,
      );

      expect(result).toEqual(resolvedChat);
      expect(mockSupportChatService.resolveChat).toHaveBeenCalledWith(
        'chat-1',
        'agent-1',
        resolveDto,
      );
      expect(mockSupportChatGateway.emitChatResolved).toHaveBeenCalledWith(
        'chat-1',
      );
    });
  });

  describe('getSupportStats', () => {
    it('should return support statistics', async () => {
      const mockStats = {
        totalChats: 100,
        activeChats: 25,
        waitingChats: 10,
        resolvedChats: 65,
        queueStats: {
          total: 10,
          byPriority: [],
          averageWaitTime: 5,
        },
      };

      mockSupportChatService.getSupportStats.mockResolvedValue(mockStats);

      const result = await controller.getSupportStats();

      expect(result).toEqual(mockStats);
      expect(mockSupportChatService.getSupportStats).toHaveBeenCalled();
    });
  });
});

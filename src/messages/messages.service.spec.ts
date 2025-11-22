import { NotificationsGateway } from '@/notifications/notifications.gateway';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesService } from './messages.service';

describe('MessagesService', () => {
  let service: MessagesService;

  const mockNotificationsGateway = {
    emitMessageToUser: jest.fn(),
    emitMessageRead: jest.fn(),
    emitConversationRead: jest.fn(),
    emitMessageDeleted: jest.fn(),
    emitTyping: jest.fn(),
  };

  const mockNotificationsService = {
    createNotification: jest.fn(),
  };

  const mockUser1 = {
    id: 'user-1',
    username: 'alice',
    email: 'alice@test.com',
  };

  const mockUser2 = {
    id: 'user-2',
    username: 'bob',
    email: 'bob@test.com',
  };

  const mockConversation = {
    id: 'conv-123',
    user1Id: 'user-1',
    user2Id: 'user-2',
    tradeId: null,
    lastMessageContent: 'Hello',
    lastMessageAt: new Date(),
    lastMessageSenderId: 'user-1',
    createdAt: new Date(),
    updatedAt: new Date(),
    user1: mockUser1,
    user2: mockUser2,
  };

  const mockMessage = {
    id: 'msg-123',
    content: 'Hello Bob!',
    type: 'text',
    senderId: 'user-1',
    conversationId: 'conv-123',
    isRead: false,
    readAt: null,
    isDeleted: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    sender: mockUser1,
    conversation: mockConversation,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendMessage', () => {
    const sendDto = {
      content: 'Hello Bob!',
      recipientId: 'user-2',
    };

    beforeEach(() => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser2);
      mockPrismaService.conversation.findFirst.mockResolvedValue(
        mockConversation,
      );
      mockPrismaService.message.create.mockResolvedValue(mockMessage);
      mockPrismaService.conversation.update.mockResolvedValue(mockConversation);
    });

    it('should send a message successfully', async () => {
      const result = await service.sendMessage('user-1', sendDto);

      expect(result).toMatchObject({
        id: mockMessage.id,
        content: mockMessage.content,
        type: mockMessage.type,
        senderId: mockMessage.senderId,
        conversationId: mockMessage.conversationId,
        isRead: mockMessage.isRead,
        readAt: mockMessage.readAt,
        sender: {
          id: mockUser1.id,
          username: mockUser1.username,
        },
      });

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-2' },
      });
      expect(mockPrismaService.message.create).toHaveBeenCalled();
      expect(mockNotificationsGateway.emitMessageToUser).toHaveBeenCalledWith(
        'user-2',
        expect.any(Object),
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        type: 'NEW_MESSAGE',
        title: `New message from ${mockUser1.username}`,
        message: sendDto.content.substring(0, 100),
        userId: 'user-2',
        metadata: {
          messageId: mockMessage.id,
          conversationId: mockConversation.id,
          senderId: 'user-1',
          senderUsername: mockUser1.username,
        },
      });
    });

    it('should throw NotFoundException if recipient does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.sendMessage('user-1', sendDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if trying to message self', async () => {
      const selfDto = {
        content: 'Hello me!',
        recipientId: 'user-1',
      };

      await expect(service.sendMessage('user-1', selfDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should create a new conversation if one does not exist', async () => {
      mockPrismaService.conversation.findFirst.mockResolvedValue(null);
      mockPrismaService.conversation.create.mockResolvedValue(mockConversation);

      await service.sendMessage('user-1', sendDto);

      expect(mockPrismaService.conversation.create).toHaveBeenCalledWith({
        data: {
          user1Id: 'user-1',
          user2Id: 'user-2',
        },
      });
    });

    it('should handle trade context when tradeId provided', async () => {
      const dtoWithTrade = {
        ...sendDto,
        tradeId: 'trade-123',
      };

      await service.sendMessage('user-1', dtoWithTrade);

      expect(mockPrismaService.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            content: dtoWithTrade.content,
          }),
        }),
      );
    });
  });

  describe('getConversations', () => {
    const mockConversations = [
      {
        ...mockConversation,
        user1: mockUser1,
        user2: mockUser2,
        messages: [mockMessage],
        _count: { messages: 2 },
      },
    ];

    it('should return user conversations with unread counts', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue(
        mockConversations,
      );
      mockPrismaService.message.count.mockResolvedValue(1);

      const result = await service.getConversations('user-1');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('otherUser');
      expect(result[0].otherUser.id).toBe('user-2');
      expect(result[0]).toHaveProperty('unreadCount');
      expect(mockPrismaService.conversation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ user1Id: 'user-1' }, { user2Id: 'user-1' }],
          },
        }),
      );
    });

    it('should return empty array if no conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);

      const result = await service.getConversations('user-1');

      expect(result).toEqual([]);
    });
  });

  describe('getMessages', () => {
    const mockMessages = [mockMessage];

    beforeEach(() => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(
        mockConversation,
      );
      mockPrismaService.message.findMany.mockResolvedValue(mockMessages);
      mockPrismaService.message.count.mockResolvedValue(1);
    });

    it('should return paginated messages for a conversation', async () => {
      const result = await service.getMessages('user-1', 'conv-123', {
        page: 1,
        limit: 50,
      });

      expect(result.messages).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrismaService.message.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            conversationId: 'conv-123',
            isDeleted: false,
          },
        }),
      );
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.getMessages('user-1', 'conv-999', { page: 1, limit: 50 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not part of conversation', async () => {
      await expect(
        service.getMessages('user-3', 'conv-123', { page: 1, limit: 50 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should handle pagination correctly', async () => {
      const manyMessages = Array.from({ length: 100 }, (_, i) => ({
        ...mockMessage,
        id: `msg-${i}`,
      }));
      mockPrismaService.message.findMany.mockResolvedValue(
        manyMessages.slice(0, 50),
      );
      mockPrismaService.message.count.mockResolvedValue(100);

      const result = await service.getMessages('user-1', 'conv-123', {
        page: 1,
        limit: 50,
      });

      expect(result.messages).toHaveLength(50);
      expect(result.total).toBe(100);
    });
  });

  describe('markAsRead', () => {
    const readMessage = {
      ...mockMessage,
      isRead: true,
      readAt: new Date(),
    };

    beforeEach(() => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue(readMessage);
    });

    it('should mark a message as read', async () => {
      const result = await service.markAsRead('user-2', 'msg-123');

      expect(result.isRead).toBe(true);
      expect(result.readAt).toBeDefined();
      expect(mockPrismaService.message.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'msg-123' },
          data: {
            isRead: true,
            readAt: expect.any(Date),
          },
        }),
      );
      expect(mockNotificationsGateway.emitMessageRead).toHaveBeenCalledWith(
        'user-1',
        'msg-123',
        'conv-123',
      );
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('user-2', 'msg-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return unmodified message if user is sender', async () => {
      const result = await service.markAsRead('user-1', 'msg-123');

      expect(result.isRead).toBe(false); // Not marked as read for sender
      expect(mockPrismaService.message.update).not.toHaveBeenCalled();
    });

    it('should not update if already read', async () => {
      const alreadyRead = { ...mockMessage, isRead: true, readAt: new Date() };
      mockPrismaService.message.findUnique.mockResolvedValue(alreadyRead);
      mockPrismaService.message.update.mockResolvedValue(alreadyRead);

      await service.markAsRead('user-2', 'msg-123');

      expect(mockPrismaService.message.update).toHaveBeenCalled();
    });
  });

  describe('markConversationAsRead', () => {
    beforeEach(() => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(
        mockConversation,
      );
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 3 });
    });

    it('should mark all unread messages in conversation as read', async () => {
      await service.markConversationAsRead('user-2', 'conv-123');

      expect(mockPrismaService.message.updateMany).toHaveBeenCalledWith({
        where: {
          conversationId: 'conv-123',
          senderId: { not: 'user-2' },
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });
      expect(
        mockNotificationsGateway.emitConversationRead,
      ).toHaveBeenCalledWith('user-1', 'conv-123', 3);
    });

    it('should throw NotFoundException if conversation does not exist', async () => {
      mockPrismaService.conversation.findUnique.mockResolvedValue(null);

      await expect(
        service.markConversationAsRead('user-2', 'conv-999'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not part of conversation', async () => {
      await expect(
        service.markConversationAsRead('user-3', 'conv-123'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('deleteMessage', () => {
    const deletedMessage = {
      ...mockMessage,
      isDeleted: true,
    };

    beforeEach(() => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue(deletedMessage);
    });

    it('should soft delete a message', async () => {
      await service.deleteMessage('user-1', 'msg-123');

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: { isDeleted: true },
      });
      expect(mockNotificationsGateway.emitMessageDeleted).toHaveBeenCalledWith(
        'user-2',
        'msg-123',
        'conv-123',
      );
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(service.deleteMessage('user-1', 'msg-999')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if user is not sender', async () => {
      await expect(service.deleteMessage('user-2', 'msg-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return total unread message count', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([
        { ...mockConversation, user1Id: 'user-1', user2Id: 'user-2' },
        { ...mockConversation, user1Id: 'user-3', user2Id: 'user-1' },
      ]);
      mockPrismaService.message.count.mockResolvedValue(5);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(5);
      expect(mockPrismaService.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: { in: expect.any(Array) },
          senderId: { not: 'user-1' },
          isRead: false,
          isDeleted: false,
        },
      });
    });

    it('should return 0 if no conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.message.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });
});

import { CacheService } from '@/cache/cache.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockCacheService } from '@/test/mocks/cache.mock';
import { mockNotificationsService } from '@/test/mocks/notifications.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

const mockMessagesGateway = {
  emitMessageToUser: jest.fn(),
  emitMessageRead: jest.fn(),
  emitConversationRead: jest.fn(),
  emitMessageDeleted: jest.fn(),
  emitMessageUpdated: jest.fn(),
  isUserOnline: jest.fn(),
};

describe('MessagesService', () => {
  let service: MessagesService;

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
          provide: MessagesGateway,
          useValue: mockMessagesGateway,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
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
      expect(mockMessagesGateway.emitMessageToUser).toHaveBeenCalledWith(
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
      expect(mockMessagesGateway.emitMessageRead).toHaveBeenCalledWith(
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
      expect(mockMessagesGateway.emitConversationRead).toHaveBeenCalledWith(
        'user-1',
        'conv-123',
        3,
      );
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
      deletedAt: new Date(),
      deletedBy: 'user-1',
    };

    beforeEach(() => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue(deletedMessage);
    });

    it('should soft delete a message', async () => {
      await service.deleteMessage('user-1', 'msg-123');

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: 'msg-123' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: 'user-1',
        },
      });
      expect(mockMessagesGateway.emitMessageDeleted).toHaveBeenCalledWith(
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

    it('should throw BadRequestException if message already deleted', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue({
        ...mockMessage,
        isDeleted: true,
      });

      await expect(service.deleteMessage('user-1', 'msg-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getUnreadCount', () => {
    const userId = 'user-1';

    it('should return cached count when cache hit', async () => {
      mockCacheService.get.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `users:${userId}:messages:unread`,
      );
      expect(mockPrismaService.conversation.findMany).not.toHaveBeenCalled(); // DB not queried on cache hit
      expect(result).toBe(5);
    });

    it('should query database and cache result when cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss
      mockPrismaService.conversation.findMany.mockResolvedValue([
        { ...mockConversation, user1Id: 'user-1', user2Id: 'user-2' },
        { ...mockConversation, user1Id: 'user-3', user2Id: 'user-1' },
      ]);
      mockPrismaService.message.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `users:${userId}:messages:unread`,
      );
      expect(mockPrismaService.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: { in: expect.any(Array) },
          senderId: { not: userId },
          isRead: false,
          isDeleted: false,
        },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `users:${userId}:messages:unread`,
        5,
        60000, // 1 minute
      );
      expect(result).toBe(5);
    });

    it('should return 0 if no conversations', async () => {
      mockPrismaService.conversation.findMany.mockResolvedValue([]);
      mockPrismaService.message.count.mockResolvedValue(0);

      const result = await service.getUnreadCount('user-1');

      expect(result).toBe(0);
    });
  });

  describe('updateMessage - Version History', () => {
    const userId = 'user-1';
    const messageId = 'msg-123';
    const newContent = 'Updated message content';

    const mockMessageVersion = {
      id: 'version-1',
      messageId: 'msg-123',
      content: 'Hello Bob!',
      editedBy: 'user-1',
      createdAt: new Date('2025-01-01T12:00:00Z'),
    };

    beforeEach(() => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.messageVersion.create.mockResolvedValue(
        mockMessageVersion,
      );
      mockPrismaService.message.update.mockResolvedValue({
        ...mockMessage,
        content: newContent,
        isEdited: true,
        editedAt: new Date('2025-01-02'),
      });
    });

    it('should create a version history entry when updating a message', async () => {
      await service.updateMessage(userId, messageId, newContent);

      expect(mockPrismaService.messageVersion.create).toHaveBeenCalledWith({
        data: {
          messageId,
          content: mockMessage.content,
          editedBy: userId,
        },
      });

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: {
          content: newContent,
          isEdited: true,
          editedAt: expect.any(Date),
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
    });

    it('should create multiple version entries on multiple edits', async () => {
      await service.updateMessage(userId, messageId, 'First edit');

      const editedMessage = {
        ...mockMessage,
        content: 'First edit',
        isEdited: true,
      };
      mockPrismaService.message.findUnique.mockResolvedValue(editedMessage);
      mockPrismaService.messageVersion.create.mockResolvedValue({
        ...mockMessageVersion,
        id: 'version-2',
        content: 'First edit',
      });

      await service.updateMessage(userId, messageId, 'Second edit');

      expect(mockPrismaService.messageVersion.create).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.messageVersion.create).toHaveBeenNthCalledWith(
        1,
        {
          data: {
            messageId,
            content: mockMessage.content,
            editedBy: userId,
          },
        },
      );
      expect(mockPrismaService.messageVersion.create).toHaveBeenNthCalledWith(
        2,
        {
          data: {
            messageId,
            content: 'First edit',
            editedBy: userId,
          },
        },
      );
    });

    it('should not create version if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(
        service.updateMessage(userId, messageId, newContent),
      ).rejects.toThrow(NotFoundException);

      expect(mockPrismaService.messageVersion.create).not.toHaveBeenCalled();
    });

    it('should not create version if user is not the sender', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue({
        ...mockMessage,
        senderId: 'different-user',
      });

      await expect(
        service.updateMessage(userId, messageId, newContent),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPrismaService.messageVersion.create).not.toHaveBeenCalled();
    });

    it('should not allow editing deleted messages', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue({
        ...mockMessage,
        isDeleted: true,
      });

      await expect(
        service.updateMessage(userId, messageId, newContent),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.messageVersion.create).not.toHaveBeenCalled();
    });

    it('should preserve original content in version, not updated content', async () => {
      const originalContent = 'This is the original';
      const updatedContent = 'This is the update';

      mockPrismaService.message.findUnique.mockResolvedValue({
        ...mockMessage,
        content: originalContent,
      });

      await service.updateMessage(userId, messageId, updatedContent);

      const createCall =
        mockPrismaService.messageVersion.create.mock.calls[0][0];
      expect(createCall.data.content).toBe(originalContent);
      expect(createCall.data.content).not.toBe(updatedContent);
    });

    it('should emit WebSocket update to other user', async () => {
      await service.updateMessage(userId, messageId, newContent);

      expect(mockMessagesGateway.emitMessageUpdated).toHaveBeenCalledWith(
        'user-2',
        expect.objectContaining({
          id: messageId,
          content: newContent,
          isEdited: true,
        }),
      );
    });
  });

  describe('getMessageVersions - Version Retrieval', () => {
    const messageId = 'msg-123';

    it('should retrieve all versions for a message', async () => {
      const mockVersions = [
        {
          id: 'version-3',
          messageId,
          content: 'Second edit',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-03'),
        },
        {
          id: 'version-2',
          messageId,
          content: 'First edit',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-02'),
        },
        {
          id: 'version-1',
          messageId,
          content: 'Original message',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPrismaService.messageVersion.findMany.mockResolvedValue(mockVersions);

      const result = await service.getMessageVersions(messageId);

      expect(mockPrismaService.messageVersion.findMany).toHaveBeenCalledWith({
        where: { messageId },
        orderBy: { createdAt: 'desc' },
      });

      expect(result).toHaveLength(3);
      expect(result[0].content).toBe('Second edit');
      expect(result[1].content).toBe('First edit');
      expect(result[2].content).toBe('Original message');
    });

    it('should return empty array if no versions exist', async () => {
      mockPrismaService.messageVersion.findMany.mockResolvedValue([]);

      const result = await service.getMessageVersions(messageId);

      expect(result).toEqual([]);
    });

    it('should return versions in descending order (newest first)', async () => {
      const mockVersions = [
        {
          id: 'version-3',
          messageId,
          content: 'Newest',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-03'),
        },
        {
          id: 'version-2',
          messageId,
          content: 'Middle',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-02'),
        },
        {
          id: 'version-1',
          messageId,
          content: 'Oldest',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPrismaService.messageVersion.findMany.mockResolvedValue(mockVersions);

      const result = await service.getMessageVersions(messageId);

      expect(result[0].content).toBe('Newest');
      expect(result[1].content).toBe('Middle');
      expect(result[2].content).toBe('Oldest');
    });

    it('should include all required fields in version DTOs', async () => {
      const mockVersions = [
        {
          id: 'version-1',
          messageId,
          content: 'Test message',
          editedBy: 'user-1',
          createdAt: new Date('2025-01-01'),
        },
      ];

      mockPrismaService.messageVersion.findMany.mockResolvedValue(mockVersions);

      const result = await service.getMessageVersions(messageId);

      expect(result[0]).toEqual({
        id: 'version-1',
        content: 'Test message',
        editedBy: 'user-1',
        createdAt: expect.any(Date),
      });
    });
  });

  describe('moderatorDeleteMessage', () => {
    const moderatorId = 'mod-1';
    const messageId = 'msg-123';
    const reason = 'Inappropriate content';

    beforeEach(() => {
      mockPrismaService.message.findUnique.mockResolvedValue(mockMessage);
      mockPrismaService.message.update.mockResolvedValue({
        ...mockMessage,
        isDeleted: true,
        deletedBy: moderatorId,
        deleteReason: reason,
      });
    });

    it('should delete message with reason and notify both users', async () => {
      await service.moderatorDeleteMessage(moderatorId, messageId, reason);

      expect(mockPrismaService.message.update).toHaveBeenCalledWith({
        where: { id: messageId },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: moderatorId,
          deleteReason: reason,
        },
      });

      expect(mockMessagesGateway.emitMessageDeleted).toHaveBeenCalledTimes(2);
      expect(mockMessagesGateway.emitMessageDeleted).toHaveBeenCalledWith(
        'user-1',
        messageId,
        'conv-123',
      );
      expect(mockMessagesGateway.emitMessageDeleted).toHaveBeenCalledWith(
        'user-2',
        messageId,
        'conv-123',
      );
    });

    it('should throw NotFoundException if message does not exist', async () => {
      mockPrismaService.message.findUnique.mockResolvedValue(null);

      await expect(
        service.moderatorDeleteMessage(moderatorId, messageId, reason),
      ).rejects.toThrow(NotFoundException);
    });
  });
});

import { mockMessagesService } from '@/test/mocks/messages.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

describe('MessagesController', () => {
  let controller: MessagesController;

  const mockMessage = {
    id: 'msg-123',
    content: 'Hello!',
    type: 'text',
    senderId: 'user-1',
    conversationId: 'conv-123',
    isRead: false,
    readAt: null,
    createdAt: new Date(),
    sender: {
      id: 'user-1',
      username: 'alice',
    },
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
    otherUser: {
      id: 'user-2',
      username: 'bob',
    },
    unreadCount: 0,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
      ],
    }).compile();

    controller = module.get<MessagesController>(MessagesController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('sendMessage', () => {
    const sendDto = {
      content: 'Hello Bob!',
      recipientId: 'user-2',
    };

    it('should send a message', async () => {
      mockMessagesService.sendMessage.mockResolvedValue(mockMessage);

      const result = await controller.sendMessage('user-1', sendDto);

      expect(result).toEqual(mockMessage);
      expect(mockMessagesService.sendMessage).toHaveBeenCalledWith(
        'user-1',
        sendDto,
      );
    });

    it('should pass tradeId when provided', async () => {
      const dtoWithTrade = { ...sendDto, tradeId: 'trade-123' };
      mockMessagesService.sendMessage.mockResolvedValue(mockMessage);

      await controller.sendMessage('user-1', dtoWithTrade);

      expect(mockMessagesService.sendMessage).toHaveBeenCalledWith(
        'user-1',
        dtoWithTrade,
      );
    });
  });

  describe('getConversations', () => {
    it('should return user conversations', async () => {
      const mockConversations = [mockConversation];
      mockMessagesService.getConversations.mockResolvedValue(mockConversations);

      const result = await controller.getConversations('user-1');

      expect(result).toEqual(mockConversations);
      expect(mockMessagesService.getConversations).toHaveBeenCalledWith(
        'user-1',
      );
    });
  });

  describe('getMessages', () => {
    const mockMessagesResponse = {
      messages: [mockMessage],
      total: 1,
      page: 1,
      limit: 50,
      totalPages: 1,
    };

    it('should return paginated messages for a conversation', async () => {
      mockMessagesService.getMessages.mockResolvedValue(mockMessagesResponse);

      const result = await controller.getMessages('user-1', 'conv-123', {
        page: 1,
        limit: 50,
      });

      expect(result).toEqual(mockMessagesResponse);
      expect(mockMessagesService.getMessages).toHaveBeenCalledWith(
        'user-1',
        'conv-123',
        { page: 1, limit: 50 },
      );
    });

    it('should use default pagination if not provided', async () => {
      mockMessagesService.getMessages.mockResolvedValue(mockMessagesResponse);

      await controller.getMessages('user-1', 'conv-123', {} as any);

      expect(mockMessagesService.getMessages).toHaveBeenCalledWith(
        'user-1',
        'conv-123',
        {},
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark a message as read', async () => {
      const readMessage = { ...mockMessage, isRead: true, readAt: new Date() };
      mockMessagesService.markAsRead.mockResolvedValue(readMessage);

      const result = await controller.markAsRead('user-1', 'msg-123');

      expect(result).toEqual(readMessage);
      expect(mockMessagesService.markAsRead).toHaveBeenCalledWith(
        'user-1',
        'msg-123',
      );
    });
  });

  describe('markConversationAsRead', () => {
    it('should mark all messages in conversation as read', async () => {
      mockMessagesService.markConversationAsRead.mockResolvedValue({
        count: 3,
      });

      const result = await controller.markConversationAsRead(
        'user-1',
        'conv-123',
      );

      expect(result).toEqual({ count: 3 });
      expect(mockMessagesService.markConversationAsRead).toHaveBeenCalledWith(
        'user-1',
        'conv-123',
      );
    });
  });

  describe('deleteMessage', () => {
    it('should delete a message', async () => {
      mockMessagesService.deleteMessage.mockResolvedValue(undefined);

      const result = await controller.deleteMessage('user-1', 'msg-123');

      expect(result).toEqual({ message: 'Message deleted successfully' });
      expect(mockMessagesService.deleteMessage).toHaveBeenCalledWith(
        'user-1',
        'msg-123',
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread message count', async () => {
      mockMessagesService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount('user-1');

      expect(result).toEqual({ count: 5 });
      expect(mockMessagesService.getUnreadCount).toHaveBeenCalledWith('user-1');
    });

    it('should return 0 if no unread messages', async () => {
      mockMessagesService.getUnreadCount.mockResolvedValue(0);

      const result = await controller.getUnreadCount('user-1');

      expect(result).toEqual({ count: 0 });
    });
  });
});

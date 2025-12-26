import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { MessagesGateway } from './messages.gateway';

const mockJwtService = {
  verifyAsync: jest.fn(),
  sign: jest.fn(),
};

describe('MessagesGateway', () => {
  let gateway: MessagesGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<MessagesGateway>(MessagesGateway);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleSubscribe', () => {
    it('should allow a user to subscribe to their room', () => {
      const userId = 'user-123';
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
        data: { userId }, // Mock WsJwtGuard setting userId
      };

      const result = gateway.handleSubscribe(mockClient, userId);

      expect(mockClient.join).toHaveBeenCalledWith(`user:${userId}`);
      expect(result).toEqual({
        success: true,
        message: 'Subscribed to messages',
      });
    });

    it('should reject subscription to another user', () => {
      const authenticatedUserId = 'user-123';
      const attemptedUserId = 'user-456';
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
        data: { userId: authenticatedUserId }, // Authenticated as user-123
      };

      const result = gateway.handleSubscribe(mockClient, attemptedUserId);

      expect(mockClient.join).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        message: 'Cannot subscribe to another user',
      });
    });
  });

  describe('handleUnsubscribe', () => {
    it('should allow a user to unsubscribe from their room', () => {
      const userId = 'user-123';
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
        leave: jest.fn(),
        data: { userId }, // Mock WsJwtGuard setting userId
      };

      // First subscribe
      gateway.handleSubscribe(mockClient, userId);

      // Then unsubscribe
      const result = gateway.handleUnsubscribe(mockClient, userId);

      expect(mockClient.leave).toHaveBeenCalledWith(`user:${userId}`);
      expect(result).toEqual({
        success: true,
        message: 'Unsubscribed from messages',
      });
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing status to conversation', () => {
      const userId = 'user-123';
      const mockClient: any = {
        id: 'socket-123',
        data: { userId }, // Mock WsJwtGuard setting userId
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      const data = {
        conversationId: 'conv-123',
        isTyping: true,
        username: 'testuser',
      };

      const result = gateway.handleTyping(mockClient, data);

      expect(mockClient.to).toHaveBeenCalledWith('conversation:conv-123');
      expect(result).toEqual({ success: true });
    });
  });

  describe('handleJoinConversation', () => {
    it('should allow a client to join a conversation room', () => {
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
      };
      const conversationId = 'conv-123';

      const result = gateway.handleJoinConversation(mockClient, conversationId);

      expect(mockClient.join).toHaveBeenCalledWith(
        `conversation:${conversationId}`,
      );
      expect(result).toEqual({ success: true, conversationId });
    });
  });

  describe('handleLeaveConversation', () => {
    it('should allow a client to leave a conversation room', () => {
      const mockClient: any = {
        id: 'socket-123',
        leave: jest.fn(),
      };
      const conversationId = 'conv-123';

      const result = gateway.handleLeaveConversation(
        mockClient,
        conversationId,
      );

      expect(mockClient.leave).toHaveBeenCalledWith(
        `conversation:${conversationId}`,
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('isUserOnline', () => {
    it('should return false for offline users', () => {
      expect(gateway.isUserOnline('user-123')).toBe(false);
    });

    it('should return true for online users', () => {
      const userId = 'user-123';
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
        data: { userId }, // Mock WsJwtGuard setting userId
      };

      gateway.handleSubscribe(mockClient, userId);
      expect(gateway.isUserOnline('user-123')).toBe(true);
    });
  });

  describe('getUserConnectionCount', () => {
    it('should return 0 for users with no connections', () => {
      expect(gateway.getUserConnectionCount('user-123')).toBe(0);
    });

    it('should return correct count for users with connections', () => {
      const userId = 'user-123';
      const mockClient1: any = {
        id: 'socket-123',
        join: jest.fn(),
        data: { userId }, // Mock WsJwtGuard setting userId
      };
      const mockClient2: any = {
        id: 'socket-456',
        join: jest.fn(),
        data: { userId }, // Mock WsJwtGuard setting userId
      };

      gateway.handleSubscribe(mockClient1, userId);
      gateway.handleSubscribe(mockClient2, userId);

      expect(gateway.getUserConnectionCount(userId)).toBe(2);
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user socket mappings on disconnect', () => {
      const userId = 'user-123';
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
        data: { userId }, // Mock WsJwtGuard setting userId
      };

      gateway.handleSubscribe(mockClient, userId);
      expect(gateway.isUserOnline(userId)).toBe(true);

      gateway.handleDisconnect(mockClient);
      expect(gateway.isUserOnline(userId)).toBe(false);
    });

    it('should handle disconnect for client without userId', () => {
      const mockClient: any = {
        id: 'socket-123',
        data: {}, // Empty data object
      };

      expect(() => gateway.handleDisconnect(mockClient)).not.toThrow();
    });
  });

  describe('handleConnection', () => {
    it('should log when client connects', () => {
      const mockClient: any = {
        id: 'socket-123',
      };

      expect(() => gateway.handleConnection(mockClient)).not.toThrow();
    });
  });

  describe('emitMessageToUser', () => {
    it('should emit message to user room', () => {
      const message = {
        id: 'msg-1',
        content: 'Hello',
        senderId: 'user-1',
        conversationId: 'conv-1',
      };

      (gateway as any).server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      gateway.emitMessageToUser('user-123', message);

      expect((gateway as any).server.to).toHaveBeenCalledWith('user:user-123');
      expect((gateway as any).server.emit).toHaveBeenCalledWith(
        'message',
        message,
      );
    });
  });

  describe('emitMessageRead', () => {
    it('should emit message read status to user', () => {
      (gateway as any).server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      gateway.emitMessageRead('user-123', 'msg-1', 'conv-1');

      expect((gateway as any).server.to).toHaveBeenCalledWith('user:user-123');
      expect((gateway as any).server.emit).toHaveBeenCalledWith('messageRead', {
        messageId: 'msg-1',
        conversationId: 'conv-1',
      });
    });
  });

  describe('emitConversationRead', () => {
    it('should emit conversation read status to user', () => {
      (gateway as any).server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      gateway.emitConversationRead('user-123', 'conv-1', 5);

      expect((gateway as any).server.to).toHaveBeenCalledWith('user:user-123');
      expect((gateway as any).server.emit).toHaveBeenCalledWith(
        'conversationRead',
        {
          conversationId: 'conv-1',
          count: 5,
        },
      );
    });
  });

  describe('emitMessageUpdated', () => {
    it('should emit message updated event to user', () => {
      const message = {
        id: 'msg-1',
        content: 'Updated content',
      };

      (gateway as any).server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      gateway.emitMessageUpdated('user-123', message);

      expect((gateway as any).server.to).toHaveBeenCalledWith('user:user-123');
      expect((gateway as any).server.emit).toHaveBeenCalledWith(
        'messageUpdated',
        message,
      );
    });
  });

  describe('emitMessageDeleted', () => {
    it('should emit message deleted event to user', () => {
      (gateway as any).server = {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      gateway.emitMessageDeleted('user-123', 'msg-1', 'conv-1');

      expect((gateway as any).server.to).toHaveBeenCalledWith('user:user-123');
      expect((gateway as any).server.emit).toHaveBeenCalledWith(
        'messageDeleted',
        {
          messageId: 'msg-1',
          conversationId: 'conv-1',
        },
      );
    });
  });

  describe('handleTyping', () => {
    it('should return error for invalid data (missing userId)', () => {
      const mockClient: any = {
        id: 'socket-123',
        data: {}, // No userId set
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      const data = {
        conversationId: 'conv-123',
        isTyping: true,
        username: 'testuser',
      };

      const result = gateway.handleTyping(mockClient, data);

      expect(result).toEqual({ success: false, message: 'Invalid data' });
    });

    it('should return error for missing conversationId', () => {
      const userId = 'user-123';
      const mockClient: any = {
        id: 'socket-123',
        data: { userId }, // Mock WsJwtGuard setting userId
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      };

      const data = {
        conversationId: '',
        isTyping: true,
        username: 'testuser',
      };

      const result = gateway.handleTyping(mockClient, data);

      expect(result).toEqual({ success: false, message: 'Invalid data' });
    });
  });
});

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
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
      };
      const userId = 'user-123';

      const result = gateway.handleSubscribe(mockClient, userId);

      expect(mockClient.join).toHaveBeenCalledWith(`user:${userId}`);
      expect(result).toEqual({
        success: true,
        message: 'Subscribed to messages',
      });
      expect((mockClient as any).userId).toBe(userId);
    });
  });

  describe('handleUnsubscribe', () => {
    it('should allow a user to unsubscribe from their room', () => {
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
        leave: jest.fn(),
      };
      const userId = 'user-123';

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
      const mockClient: any = {
        id: 'socket-123',
        userId: 'user-123',
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
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
      };

      gateway.handleSubscribe(mockClient, 'user-123');
      expect(gateway.isUserOnline('user-123')).toBe(true);
    });
  });

  describe('getUserConnectionCount', () => {
    it('should return 0 for users with no connections', () => {
      expect(gateway.getUserConnectionCount('user-123')).toBe(0);
    });

    it('should return correct count for users with connections', () => {
      const mockClient1: any = {
        id: 'socket-123',
        join: jest.fn(),
      };
      const mockClient2: any = {
        id: 'socket-456',
        join: jest.fn(),
      };

      gateway.handleSubscribe(mockClient1, 'user-123');
      gateway.handleSubscribe(mockClient2, 'user-123');

      expect(gateway.getUserConnectionCount('user-123')).toBe(2);
    });
  });

  describe('handleDisconnect', () => {
    it('should clean up user socket mappings on disconnect', () => {
      const mockClient: any = {
        id: 'socket-123',
        join: jest.fn(),
        userId: 'user-123',
      };

      gateway.handleSubscribe(mockClient, 'user-123');
      expect(gateway.isUserOnline('user-123')).toBe(true);

      gateway.handleDisconnect(mockClient);
      expect(gateway.isUserOnline('user-123')).toBe(false);
    });
  });
});

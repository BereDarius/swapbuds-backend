import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { NotificationsGateway } from './notifications.gateway';

describe('NotificationsGateway', () => {
  let gateway: NotificationsGateway;
  let mockSocket: Partial<Socket>;
  let mockServer: any;

  const mockJwtService = {
    verify: jest.fn(),
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    gateway = module.get<NotificationsGateway>(NotificationsGateway);

    // Mock socket
    mockSocket = {
      id: 'socket-123',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      data: {},
    };

    // Mock server
    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    gateway.server = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should log connection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket as Socket);

      expect(logSpy).toHaveBeenCalledWith('Client connected: socket-123');
    });
  });

  describe('handleDisconnect', () => {
    it('should log disconnection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(mockSocket as Socket);

      expect(logSpy).toHaveBeenCalledWith('Client disconnected: socket-123');
    });

    it('should remove socket from user socket set', () => {
      const userId = 'user-123';
      (mockSocket as any).userId = userId;

      // Add socket to user's set
      gateway['userSockets'].set(userId, new Set(['socket-123']));

      gateway.handleDisconnect(mockSocket as Socket);

      const userSockets = gateway['userSockets'].get(userId);
      expect(userSockets).toBeUndefined();
    });

    it('should clean up user sockets map when last socket disconnects', () => {
      const userId = 'user-123';
      (mockSocket as any).userId = userId;

      // Add multiple sockets for the user
      gateway['userSockets'].set(userId, new Set(['socket-123', 'socket-456']));

      gateway.handleDisconnect(mockSocket as Socket);

      // First disconnect should remove socket-123 but keep the user entry
      const userSockets = gateway['userSockets'].get(userId);
      expect(userSockets?.has('socket-123')).toBe(false);
      expect(userSockets?.has('socket-456')).toBe(true);
    });

    it('should handle disconnect when userId is not set', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(mockSocket as Socket);

      expect(logSpy).toHaveBeenCalledWith('Client disconnected: socket-123');
      expect(gateway['userSockets'].size).toBe(0);
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe client to user room', () => {
      const result = gateway.handleSubscribe(mockSocket as Socket, 'user-123');

      expect(mockSocket.join).toHaveBeenCalledWith('user:user-123');
      expect(result).toEqual({
        success: true,
        message: 'Subscribed to notifications',
      });
    });

    it('should store userId on socket', () => {
      gateway.handleSubscribe(mockSocket as Socket, 'user-123');

      expect((mockSocket as any).userId).toBe('user-123');
    });

    it('should add socket to user sockets map', () => {
      gateway.handleSubscribe(mockSocket as Socket, 'user-123');

      const userSockets = gateway['userSockets'].get('user-123');
      expect(userSockets).toBeDefined();
      expect(userSockets?.has('socket-123')).toBe(true);
    });

    it('should add multiple sockets for the same user', () => {
      const mockSocket2: Partial<Socket> = {
        id: 'socket-456',
        join: jest.fn(),
        data: {},
      };

      gateway.handleSubscribe(mockSocket as Socket, 'user-123');
      gateway.handleSubscribe(mockSocket2 as Socket, 'user-123');

      const userSockets = gateway['userSockets'].get('user-123');
      expect(userSockets?.size).toBe(2);
      expect(userSockets?.has('socket-123')).toBe(true);
      expect(userSockets?.has('socket-456')).toBe(true);
    });

    it('should log subscription', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleSubscribe(mockSocket as Socket, 'user-123');

      expect(logSpy).toHaveBeenCalledWith(
        'Client socket-123 subscribed to user:user-123',
      );
    });
  });

  describe('handleUnsubscribe', () => {
    it('should unsubscribe client from user room', () => {
      // First subscribe
      gateway.handleSubscribe(mockSocket as Socket, 'user-123');

      const result = gateway.handleUnsubscribe(
        mockSocket as Socket,
        'user-123',
      );

      expect(mockSocket.leave).toHaveBeenCalledWith('user:user-123');
      expect(result).toEqual({
        success: true,
        message: 'Unsubscribed from notifications',
      });
    });

    it('should remove socket from user sockets map', () => {
      // First subscribe
      gateway.handleSubscribe(mockSocket as Socket, 'user-123');
      expect(gateway['userSockets'].get('user-123')?.has('socket-123')).toBe(
        true,
      );

      gateway.handleUnsubscribe(mockSocket as Socket, 'user-123');

      expect(gateway['userSockets'].has('user-123')).toBe(false);
    });

    it('should log unsubscription', () => {
      gateway.handleSubscribe(mockSocket as Socket, 'user-123');
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleUnsubscribe(mockSocket as Socket, 'user-123');

      expect(logSpy).toHaveBeenCalledWith(
        'Client socket-123 unsubscribed from user:user-123',
      );
    });
  });

  describe('emitNotificationToUser', () => {
    const mockNotification = {
      id: 'notif-123',
      type: 'TRADE_PROPOSAL',
      message: 'New trade proposal',
      userId: 'user-123',
    };

    it('should emit notification event to user room', () => {
      gateway.emitNotificationToUser('user-123', mockNotification);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        mockNotification,
      );
    });

    it('should log emission', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.emitNotificationToUser('user-123', mockNotification);

      expect(logSpy).toHaveBeenCalledWith(
        'Emitted notification to user:user-123',
      );
    });
  });

  describe('emitNotificationRead', () => {
    it('should emit notificationRead event to user room', () => {
      gateway.emitNotificationRead('user-123', 'notif-123');

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('notificationRead', {
        notificationId: 'notif-123',
      });
    });

    it('should log emission', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.emitNotificationRead('user-123', 'notif-123');

      expect(logSpy).toHaveBeenCalledWith(
        'Emitted notification read status to user:user-123, notificationId:notif-123',
      );
    });
  });

  describe('emitAllNotificationsRead', () => {
    it('should emit allNotificationsRead event to user room', () => {
      gateway.emitAllNotificationsRead('user-123', 5);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('allNotificationsRead', {
        count: 5,
      });
    });

    it('should log emission', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.emitAllNotificationsRead('user-123', 3);

      expect(logSpy).toHaveBeenCalledWith(
        'Emitted all notifications read to user:user-123, count:3',
      );
    });
  });

  describe('emitNotificationDeleted', () => {
    it('should emit notificationDeleted event to user room', () => {
      gateway.emitNotificationDeleted('user-123', 'notif-123');

      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('notificationDeleted', {
        notificationId: 'notif-123',
      });
    });

    it('should log emission', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.emitNotificationDeleted('user-123', 'notif-123');

      expect(logSpy).toHaveBeenCalledWith(
        'Emitted notification deleted to user:user-123, notificationId:notif-123',
      );
    });
  });

  describe('isUserOnline', () => {
    it('should return true if user has active connections', () => {
      gateway['userSockets'].set('user-123', new Set(['socket-123']));

      const result = gateway.isUserOnline('user-123');

      expect(result).toBe(true);
    });

    it('should return false if user has no active connections', () => {
      const result = gateway.isUserOnline('user-123');

      expect(result).toBe(false);
    });

    it('should return false if user has empty socket set', () => {
      gateway['userSockets'].set('user-123', new Set());

      const result = gateway.isUserOnline('user-123');

      expect(result).toBe(false);
    });
  });

  describe('getUserConnectionCount', () => {
    it('should return correct connection count', () => {
      gateway['userSockets'].set(
        'user-123',
        new Set(['socket-123', 'socket-456', 'socket-789']),
      );

      const count = gateway.getUserConnectionCount('user-123');

      expect(count).toBe(3);
    });

    it('should return 0 if user has no connections', () => {
      const count = gateway.getUserConnectionCount('user-123');

      expect(count).toBe(0);
    });

    it('should return 0 if user has empty socket set', () => {
      gateway['userSockets'].set('user-123', new Set());

      const count = gateway.getUserConnectionCount('user-123');

      expect(count).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple users with multiple connections', () => {
      const user1Socket1: Partial<Socket> = {
        id: 'socket-1',
        join: jest.fn(),
        data: {},
      };
      const user1Socket2: Partial<Socket> = {
        id: 'socket-2',
        join: jest.fn(),
        data: {},
      };
      const user2Socket1: Partial<Socket> = {
        id: 'socket-3',
        join: jest.fn(),
        data: {},
      };

      (user1Socket1 as any).userId = 'user-1';
      (user1Socket2 as any).userId = 'user-1';
      (user2Socket1 as any).userId = 'user-2';

      gateway.handleSubscribe(user1Socket1 as Socket, 'user-1');
      gateway.handleSubscribe(user1Socket2 as Socket, 'user-1');
      gateway.handleSubscribe(user2Socket1 as Socket, 'user-2');

      expect(gateway.getUserConnectionCount('user-1')).toBe(2);
      expect(gateway.getUserConnectionCount('user-2')).toBe(1);
      expect(gateway.isUserOnline('user-1')).toBe(true);
      expect(gateway.isUserOnline('user-2')).toBe(true);

      // Disconnect one socket from user-1
      gateway.handleDisconnect(user1Socket1 as Socket);

      expect(gateway.getUserConnectionCount('user-1')).toBe(1);
      expect(gateway.isUserOnline('user-1')).toBe(true);

      // Disconnect last socket from user-1
      gateway.handleDisconnect(user1Socket2 as Socket);

      expect(gateway.getUserConnectionCount('user-1')).toBe(0);
      expect(gateway.isUserOnline('user-1')).toBe(false);
      expect(gateway.isUserOnline('user-2')).toBe(true);
    });

    it('should emit to all user connections', () => {
      gateway['userSockets'].set('user-123', new Set(['socket-1', 'socket-2']));

      const mockNotification = {
        id: 'notif-123',
        type: 'TRADE_PROPOSAL',
        message: 'New trade proposal',
        userId: 'user-123',
      };

      gateway.emitNotificationToUser('user-123', mockNotification);

      // Should emit to the room once (Socket.io handles broadcasting to all sockets in room)
      expect(mockServer.to).toHaveBeenCalledWith('user:user-123');
      expect(mockServer.emit).toHaveBeenCalledTimes(1);
      expect(mockServer.emit).toHaveBeenCalledWith(
        'notification',
        mockNotification,
      );
    });
  });
});

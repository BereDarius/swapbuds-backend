import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { mockJwtService } from '@/test/mocks/jwt.mock';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { AdminGateway } from './admin.gateway';

describe('AdminGateway', () => {
  let gateway: AdminGateway;
  let mockSocket: Partial<Socket>;
  let mockServer: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGateway,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    })
      .overrideGuard(WsJwtGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    gateway = module.get<AdminGateway>(AdminGateway);

    // Mock socket
    mockSocket = {
      id: 'socket-123',
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
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
    it('should store admin socket connection', async () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;

      await gateway.handleConnection(mockSocket as Socket);

      expect(gateway.isAdminConnected(adminUserId)).toBe(true);
      expect(gateway.getConnectedAdminCount()).toBe(1);
    });

    it('should track multiple sockets for same admin', async () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;

      await gateway.handleConnection(mockSocket as Socket);

      const mockSocket2 = { ...mockSocket, id: 'socket-456' };
      mockSocket2.data = { adminUserId };
      await gateway.handleConnection(mockSocket2 as Socket);

      expect(gateway.isAdminConnected(adminUserId)).toBe(true);
      expect(gateway.getConnectedAdminCount()).toBe(1);
    });

    it('should disconnect client if no adminUserId in socket data', async () => {
      mockSocket.data = {};

      await gateway.handleConnection(mockSocket as Socket);

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it('should log connection', async () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      await gateway.handleConnection(mockSocket as Socket);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Admin connected: ${adminUserId}`),
      );
    });

    it('should handle connection errors gracefully', async () => {
      const errorSpy = jest.spyOn(gateway['logger'], 'error');
      mockSocket.data.adminUserId = 'admin-123';
      // Force an error by making join throw
      jest.spyOn(gateway['adminSockets'], 'get').mockImplementation(() => {
        throw new Error('Test error');
      });

      await gateway.handleConnection(mockSocket as Socket);

      expect(errorSpy).toHaveBeenCalled();
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('handleDisconnect', () => {
    it('should remove socket from admin socket set', () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;

      // Add socket to admin's set
      gateway['adminSockets'].set(adminUserId, new Set(['socket-123']));

      gateway.handleDisconnect(mockSocket as Socket);

      expect(gateway.isAdminConnected(adminUserId)).toBe(false);
    });

    it('should clean up admin sockets map when last socket disconnects', () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;

      // Add socket to admin's set
      gateway['adminSockets'].set(adminUserId, new Set(['socket-123']));

      gateway.handleDisconnect(mockSocket as Socket);

      expect(gateway['adminSockets'].has(adminUserId)).toBe(false);
    });

    it('should keep admin in map if other sockets remain', () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;

      // Add multiple sockets for same admin
      gateway['adminSockets'].set(
        adminUserId,
        new Set(['socket-123', 'socket-456']),
      );

      gateway.handleDisconnect(mockSocket as Socket);

      expect(gateway.isAdminConnected(adminUserId)).toBe(true);
      expect(gateway['adminSockets'].get(adminUserId)?.size).toBe(1);
    });

    it('should log disconnection with admin info', () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway['adminSockets'].set(adminUserId, new Set(['socket-123']));

      gateway.handleDisconnect(mockSocket as Socket);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Admin disconnected: ${adminUserId}`),
      );
    });

    it('should log unknown client disconnection', () => {
      mockSocket.data = {};
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(mockSocket as Socket);

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown client disconnected'),
      );
    });
  });

  describe('handleSubscribe', () => {
    it('should subscribe admin to their personal room', () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;

      const result = gateway.handleSubscribe(mockSocket as Socket, {
        adminUserId,
      });

      expect(mockSocket.join).toHaveBeenCalledWith(`admin:${adminUserId}`);
      expect(result).toEqual({
        event: 'subscribed',
        data: { room: `admin:${adminUserId}` },
      });
    });

    it('should not allow subscribing to another admin', () => {
      mockSocket.data.adminUserId = 'admin-123';
      const warnSpy = jest.spyOn(gateway['logger'], 'warn');

      const result = gateway.handleSubscribe(mockSocket as Socket, {
        adminUserId: 'admin-456',
      });

      expect(mockSocket.join).not.toHaveBeenCalled();
      expect(result).toEqual({
        event: 'error',
        data: { message: 'Cannot subscribe to another admin user' },
      });
      expect(warnSpy).toHaveBeenCalled();
    });

    it('should log subscription', () => {
      const adminUserId = 'admin-123';
      mockSocket.data.adminUserId = adminUserId;
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleSubscribe(mockSocket as Socket, { adminUserId });

      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Admin ${adminUserId} subscribed`),
      );
    });
  });

  describe('emitToAdmin', () => {
    it('should emit event to admin room', () => {
      const adminUserId = 'admin-123';
      const event = 'ticket:assigned';
      const data = { ticketId: 'ticket-1', priority: 'high' };

      gateway.emitToAdmin(adminUserId, event, data);

      expect(mockServer.to).toHaveBeenCalledWith(`admin:${adminUserId}`);
      expect(mockServer.emit).toHaveBeenCalledWith(event, data);
    });

    it('should log emission', () => {
      const debugSpy = jest.spyOn(gateway['logger'], 'debug');
      const adminUserId = 'admin-123';

      gateway.emitToAdmin(adminUserId, 'test:event', {});

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining(`Emitted test:event to admin ${adminUserId}`),
      );
    });
  });

  describe('emitToAdmins', () => {
    it('should emit event to multiple admins', () => {
      const adminUserIds = ['admin-123', 'admin-456', 'admin-789'];
      const event = 'approval:pending';
      const data = { inviteId: 'invite-1' };

      gateway.emitToAdmins(adminUserIds, event, data);

      expect(mockServer.to).toHaveBeenCalledTimes(3);
      expect(mockServer.to).toHaveBeenCalledWith('admin:admin-123');
      expect(mockServer.to).toHaveBeenCalledWith('admin:admin-456');
      expect(mockServer.to).toHaveBeenCalledWith('admin:admin-789');
      expect(mockServer.emit).toHaveBeenCalledTimes(3);
    });

    it('should handle empty array', () => {
      gateway.emitToAdmins([], 'test:event', {});

      expect(mockServer.to).not.toHaveBeenCalled();
      expect(mockServer.emit).not.toHaveBeenCalled();
    });

    it('should log emission to multiple admins', () => {
      const debugSpy = jest.spyOn(gateway['logger'], 'debug');
      const adminUserIds = ['admin-123', 'admin-456'];

      gateway.emitToAdmins(adminUserIds, 'test:event', {});

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Emitted test:event to 2 admins'),
      );
    });
  });

  describe('broadcastToAllAdmins', () => {
    it('should broadcast event to all connected admins', () => {
      const event = 'system:maintenance';
      const data = { message: 'System will be down in 10 minutes' };

      gateway.broadcastToAllAdmins(event, data);

      expect(mockServer.emit).toHaveBeenCalledWith(event, data);
    });

    it('should log broadcast', () => {
      const debugSpy = jest.spyOn(gateway['logger'], 'debug');

      gateway.broadcastToAllAdmins('test:event', {});

      expect(debugSpy).toHaveBeenCalledWith(
        expect.stringContaining('Broadcasted test:event to all admins'),
      );
    });
  });

  describe('getConnectedAdminCount', () => {
    it('should return 0 when no admins connected', () => {
      expect(gateway.getConnectedAdminCount()).toBe(0);
    });

    it('should return correct count of connected admins', () => {
      gateway['adminSockets'].set('admin-123', new Set(['socket-1']));
      gateway['adminSockets'].set('admin-456', new Set(['socket-2']));
      gateway['adminSockets'].set(
        'admin-789',
        new Set(['socket-3', 'socket-4']),
      );

      expect(gateway.getConnectedAdminCount()).toBe(3);
    });
  });

  describe('isAdminConnected', () => {
    it('should return true when admin has active sockets', () => {
      const adminUserId = 'admin-123';
      gateway['adminSockets'].set(adminUserId, new Set(['socket-1']));

      expect(gateway.isAdminConnected(adminUserId)).toBe(true);
    });

    it('should return false when admin not in map', () => {
      expect(gateway.isAdminConnected('admin-999')).toBe(false);
    });

    it('should return false when admin has empty socket set', () => {
      const adminUserId = 'admin-123';
      gateway['adminSockets'].set(adminUserId, new Set());

      expect(gateway.isAdminConnected(adminUserId)).toBe(false);
    });

    it('should return true when admin has multiple sockets', () => {
      const adminUserId = 'admin-123';
      gateway['adminSockets'].set(
        adminUserId,
        new Set(['socket-1', 'socket-2', 'socket-3']),
      );

      expect(gateway.isAdminConnected(adminUserId)).toBe(true);
    });
  });
});

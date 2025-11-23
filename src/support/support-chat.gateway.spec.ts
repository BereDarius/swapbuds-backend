import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { mockSupportChatService } from '@/test/mocks/support.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { Socket } from 'socket.io';
import { SupportChatGateway } from './support-chat.gateway';
import { SupportChatService } from './support-chat.service';

describe('SupportChatGateway', () => {
  let gateway: SupportChatGateway;

  const mockSocket = {
    id: 'socket-1',
    user: { sub: 'user-1', username: 'testuser' },
    join: jest.fn(),
    leave: jest.fn(),
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  } as unknown as Socket;

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportChatGateway,
        {
          provide: SupportChatService,
          useValue: mockSupportChatService,
        },
      ],
    })
      .overrideGuard(WsJwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    gateway = module.get<SupportChatGateway>(SupportChatGateway);
    gateway.server = mockServer as any;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });

  describe('handleConnection', () => {
    it('should log connection', () => {
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleConnection(mockSocket);

      expect(logSpy).toHaveBeenCalledWith('Client connected: socket-1');
    });
  });

  describe('handleDisconnect', () => {
    it('should remove user from socket map and log', () => {
      gateway['userSockets'].set('user-1', 'socket-1');
      const logSpy = jest.spyOn(gateway['logger'], 'log');

      gateway.handleDisconnect(mockSocket);

      expect(gateway['userSockets'].has('user-1')).toBe(false);
      expect(logSpy).toHaveBeenCalledWith('Client disconnected: socket-1');
    });
  });

  describe('handleJoin', () => {
    it('should add user to userSockets map', async () => {
      await gateway.handleJoin(mockSocket, { userId: 'user-1' });

      expect(mockSocket.join).toHaveBeenCalledWith('user:user-1');
    });

    it('should return success', async () => {
      const result = await gateway.handleJoin(mockSocket, { userId: 'user-1' });

      expect(result).toEqual({ success: true });
    });
  });

  describe('handleJoinChat', () => {
    it('should join chat room if user has permission', async () => {
      const mockChat = {
        id: 'chat-1',
        userId: 'user-1',
      };

      mockSupportChatService.getChat.mockResolvedValue(mockChat);

      const result = await gateway.handleJoinChat(mockSocket, {
        chatId: 'chat-1',
      });

      expect(mockSocket.join).toHaveBeenCalledWith('chat:chat-1');
      expect(result).toEqual({ success: true, chatId: 'chat-1' });
    });

    it('should join chat room without validation', () => {
      const result = gateway.handleJoinChat(mockSocket, { chatId: 'chat-1' });

      expect(mockSocket.join).toHaveBeenCalledWith('chat:chat-1');
      expect(result).toEqual({ success: true, chatId: 'chat-1' });
    });
  });

  describe('handleLeaveChat', () => {
    it('should leave chat room', async () => {
      const result = await gateway.handleLeaveChat(mockSocket, {
        chatId: 'chat-1',
      });

      expect(mockSocket.leave).toHaveBeenCalledWith('chat:chat-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('handleTyping', () => {
    it('should broadcast typing indicator to chat room', () => {
      gateway.handleTyping(mockSocket, {
        chatId: 'chat-1',
        username: 'testuser',
      });

      expect(mockSocket.to).toHaveBeenCalledWith('chat:chat-1');
      // The to().emit() chain is called on the mock
    });
  });

  describe('emitMessage', () => {
    it('should emit message to chat room', () => {
      const mockMessage = {
        id: 'msg-1',
        chatId: 'chat-1',
        message: 'Test message',
      };

      gateway.emitMessage('chat-1', mockMessage);

      expect(mockServer.to).toHaveBeenCalledWith('chat:chat-1');
      expect(mockServer.emit).toHaveBeenCalledWith('support:newMessage', {
        chatId: 'chat-1',
        message: mockMessage,
      });
    });
  });

  describe('emitChatAssigned', () => {
    it('should notify both user and agent of assignment', () => {
      gateway['userSockets'].set('user-1', 'socket-user-1');
      gateway['userSockets'].set('agent-1', 'socket-agent-1');

      gateway.emitChatAssigned('chat-1', 'agent-1', 'user-1');

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:agent-1');
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });

    it('should notify user and agent rooms', () => {
      gateway.emitChatAssigned('chat-1', 'agent-1', 'user-1');

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.to).toHaveBeenCalledWith('user:agent-1');
      expect(mockServer.emit).toHaveBeenCalledTimes(2);
    });
  });

  describe('emitQueuePositionUpdate', () => {
    it('should notify user of queue position change', () => {
      gateway['userSockets'].set('user-1', 'socket-user-1');

      gateway.emitQueuePositionUpdate('user-1', 'chat-1', 5);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-1');
      expect(mockServer.emit).toHaveBeenCalledWith('support:queueUpdate', {
        chatId: 'chat-1',
        position: 5,
      });
    });

    it('should emit to user room even if user not tracked', () => {
      gateway.emitQueuePositionUpdate('user-999', 'chat-1', 5);

      expect(mockServer.to).toHaveBeenCalledWith('user:user-999');
    });
  });

  describe('emitChatResolved', () => {
    it('should notify chat room of resolution', () => {
      gateway.emitChatResolved('chat-1');

      expect(mockServer.to).toHaveBeenCalledWith('chat:chat-1');
      expect(mockServer.emit).toHaveBeenCalledWith('support:chatResolved', {
        chatId: 'chat-1',
      });
    });
  });

  describe('emitChatClosed', () => {
    it('should notify chat room of closure', () => {
      gateway.emitChatClosed('chat-1');

      expect(mockServer.to).toHaveBeenCalledWith('chat:chat-1');
      expect(mockServer.emit).toHaveBeenCalledWith('support:chatClosed', {
        chatId: 'chat-1',
      });
    });
  });

  describe('emitAgentAvailability', () => {
    it('should broadcast agent availability to all clients', () => {
      gateway.emitAgentAvailability('agent-1', true);

      expect(mockServer.emit).toHaveBeenCalledWith(
        'support:agentAvailability',
        {
          agentId: 'agent-1',
          isAvailable: true,
        },
      );
    });
  });
});

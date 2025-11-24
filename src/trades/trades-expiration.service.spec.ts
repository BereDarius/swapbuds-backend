import { MailService } from '@/mail/mail.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockMailService } from '@/test/mocks/mail.mock';
import { mockNotificationsService } from '@/test/mocks/notifications.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationType, TradeStatus } from '@prisma/client';
import { TradeExpirationService } from './trades-expiration.service';

// Mock ConfigService
const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'TRADE_EXPIRATION_HOURS') return 72;
    if (key === 'TRADE_EXPIRATION_NOTIFICATION_HOURS') return 24;
    return undefined;
  }),
};

describe('TradeExpirationService', () => {
  let service: TradeExpirationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradeExpirationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<TradeExpirationService>(TradeExpirationService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateExpirationDate', () => {
    it('should calculate expiration date 72 hours from now', () => {
      const beforeCall = new Date();
      const expiresAt = service.calculateExpirationDate();

      // Should be approximately 72 hours (in milliseconds)
      const expectedTime = 72 * 60 * 60 * 1000;
      const actualTime = expiresAt.getTime() - beforeCall.getTime();

      // Allow 1 second tolerance for test execution time
      expect(actualTime).toBeGreaterThanOrEqual(expectedTime - 1000);
      expect(actualTime).toBeLessThanOrEqual(expectedTime + 1000);
    });
  });

  describe('getExpirationConfig', () => {
    it('should return expiration configuration', () => {
      const config = service.getExpirationConfig();

      expect(config).toEqual({
        expirationHours: 72,
        notificationHoursBefore: 24,
      });
    });
  });

  describe('handleTradeExpiration', () => {
    it('should expire trades and send notifications and emails', async () => {
      const mockExpiredTrade = {
        id: 'trade-123',
        proposerId: 'user-1',
        responderId: 'user-2',
        status: TradeStatus.PENDING,
        expiresAt: new Date(),
        proposer: {
          id: 'user-1',
          username: 'proposer1',
        },
        responder: {
          id: 'user-2',
          username: 'responder1',
        },
        itemOffered: {
          id: 'item-1',
          title: 'Offered Item',
        },
        itemRequested: {
          id: 'item-2',
          title: 'Requested Item',
        },
      };

      const mockProposerUser = { email: 'proposer@example.com' };
      const mockResponderUser = { email: 'responder@example.com' };

      mockPrismaService.trade.findMany.mockResolvedValue([mockExpiredTrade]);
      mockPrismaService.trade.update.mockResolvedValue(mockExpiredTrade);
      mockPrismaService.user.findUnique
        .mockResolvedValueOnce(mockProposerUser)
        .mockResolvedValueOnce(mockResponderUser);

      await service.handleTradeExpiration();

      // Should update trade status
      expect(mockPrismaService.trade.update).toHaveBeenCalledWith({
        where: { id: 'trade-123' },
        data: { status: TradeStatus.EXPIRED },
      });

      // Should send in-app notifications to both parties
      expect(mockNotificationsService.createNotification).toHaveBeenCalledTimes(
        2,
      );
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        userId: 'user-1',
        type: NotificationType.TRADE_CANCELLED,
        title: 'Trade Expired',
        message: 'Your trade proposal for "Requested Item" has expired',
        metadata: { tradeId: 'trade-123' },
      });
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        userId: 'user-2',
        type: NotificationType.TRADE_CANCELLED,
        title: 'Trade Expired',
        message: 'Trade proposal from proposer1 for "Offered Item" has expired',
        metadata: { tradeId: 'trade-123' },
      });

      // Should send emails to both parties
      expect(mockMailService.sendTradeExpired).toHaveBeenCalledTimes(2);
      expect(mockMailService.sendTradeExpired).toHaveBeenCalledWith(
        'proposer@example.com',
        'proposer1',
        {
          itemName: 'Requested Item',
          otherPartyName: 'responder1',
          tradeId: 'trade-123',
          isProposer: true,
        },
      );
      expect(mockMailService.sendTradeExpired).toHaveBeenCalledWith(
        'responder@example.com',
        'responder1',
        {
          itemName: 'Offered Item',
          otherPartyName: 'proposer1',
          tradeId: 'trade-123',
          isProposer: false,
        },
      );
    });

    it('should handle no expired trades', async () => {
      mockPrismaService.trade.findMany.mockResolvedValue([]);

      await service.handleTradeExpiration();

      expect(mockPrismaService.trade.update).not.toHaveBeenCalled();
      expect(
        mockNotificationsService.createNotification,
      ).not.toHaveBeenCalled();
      expect(mockMailService.sendTradeExpired).not.toHaveBeenCalled();
    });

    it('should continue processing other trades if one fails', async () => {
      const mockExpiredTrades = [
        {
          id: 'trade-1',
          proposerId: 'user-1',
          responderId: 'user-2',
          status: TradeStatus.PENDING,
          expiresAt: new Date(),
          proposer: { id: 'user-1', username: 'proposer1' },
          responder: { id: 'user-2', username: 'responder1' },
          itemOffered: { id: 'item-1', title: 'Item 1' },
          itemRequested: { id: 'item-2', title: 'Item 2' },
        },
        {
          id: 'trade-2',
          proposerId: 'user-3',
          responderId: 'user-4',
          status: TradeStatus.PENDING,
          expiresAt: new Date(),
          proposer: { id: 'user-3', username: 'proposer2' },
          responder: { id: 'user-4', username: 'responder2' },
          itemOffered: { id: 'item-3', title: 'Item 3' },
          itemRequested: { id: 'item-4', title: 'Item 4' },
        },
      ];

      mockPrismaService.trade.findMany.mockResolvedValue(mockExpiredTrades);
      mockPrismaService.trade.update
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce(mockExpiredTrades[1]);

      mockPrismaService.user.findUnique
        .mockResolvedValueOnce({ email: 'user3@example.com' })
        .mockResolvedValueOnce({ email: 'user4@example.com' });

      await service.handleTradeExpiration();

      // Should still attempt to update second trade
      expect(mockPrismaService.trade.update).toHaveBeenCalledTimes(2);
    });
  });

  describe('handleExpirationWarnings', () => {
    it('should send warning notifications and emails for expiring trades', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 20 * 60 * 60 * 1000); // 20 hours from now

      const mockExpiringTrade = {
        id: 'trade-123',
        proposerId: 'user-1',
        responderId: 'user-2',
        status: TradeStatus.PENDING,
        expiresAt,
        proposer: {
          id: 'user-1',
          username: 'proposer1',
        },
        responder: {
          id: 'user-2',
          username: 'responder1',
        },
        itemOffered: {
          id: 'item-1',
          title: 'Offered Item',
        },
        itemRequested: {
          id: 'item-2',
          title: 'Requested Item',
        },
      };

      const mockResponderUser = { email: 'responder@example.com' };

      mockPrismaService.trade.findMany.mockResolvedValue([mockExpiringTrade]);
      mockPrismaService.user.findUnique.mockResolvedValue(mockResponderUser);

      await service.handleExpirationWarnings();

      // Should send in-app notification to responder
      expect(mockNotificationsService.createNotification).toHaveBeenCalledWith({
        userId: 'user-2',
        type: NotificationType.TRADE_PROPOSAL,
        title: 'Trade Expiring Soon',
        message: 'Trade proposal from proposer1 expires in 20 hours',
        metadata: { tradeId: 'trade-123', hoursRemaining: 20 },
      });

      // Should send email to responder
      expect(mockMailService.sendTradeExpiringWarning).toHaveBeenCalledWith(
        'responder@example.com',
        'responder1',
        {
          proposerName: 'proposer1',
          offeredItemName: 'Offered Item',
          requestedItemName: 'Requested Item',
          hoursRemaining: 20,
          tradeId: 'trade-123',
        },
      );
    });

    it('should handle no expiring trades', async () => {
      mockPrismaService.trade.findMany.mockResolvedValue([]);

      await service.handleExpirationWarnings();

      expect(
        mockNotificationsService.createNotification,
      ).not.toHaveBeenCalled();
      expect(mockMailService.sendTradeExpiringWarning).not.toHaveBeenCalled();
    });

    it('should continue processing other warnings if one fails', async () => {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 20 * 60 * 60 * 1000);

      const mockExpiringTrades = [
        {
          id: 'trade-1',
          proposerId: 'user-1',
          responderId: 'user-2',
          status: TradeStatus.PENDING,
          expiresAt,
          proposer: { id: 'user-1', username: 'proposer1' },
          responder: { id: 'user-2', username: 'responder1' },
          itemOffered: { id: 'item-1', title: 'Item 1' },
          itemRequested: { id: 'item-2', title: 'Item 2' },
        },
        {
          id: 'trade-2',
          proposerId: 'user-3',
          responderId: 'user-4',
          status: TradeStatus.PENDING,
          expiresAt,
          proposer: { id: 'user-3', username: 'proposer2' },
          responder: { id: 'user-4', username: 'responder2' },
          itemOffered: { id: 'item-3', title: 'Item 3' },
          itemRequested: { id: 'item-4', title: 'Item 4' },
        },
      ];

      mockPrismaService.trade.findMany.mockResolvedValue(mockExpiringTrades);
      mockPrismaService.user.findUnique
        .mockRejectedValueOnce(new Error('User not found'))
        .mockResolvedValueOnce({ email: 'user4@example.com' });

      await service.handleExpirationWarnings();

      // Should still attempt second warning
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});

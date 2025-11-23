import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsService } from './notifications.service';

import { CacheService } from '@/cache/cache.service';
import { MailService } from '@/mail/mail.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  mockNotification,
  mockNotifications,
  mockReadNotification,
  mockTradeAcceptedNotification,
  mockUnreadNotifications,
} from '@/test/fixtures/notification.fixture';
import { mockTradeWithRelations } from '@/test/fixtures/trade.fixture';
import { mockCacheService } from '@/test/mocks/cache.mock';
import { mockMailService } from '@/test/mocks/mail.mock';
import { mockNotificationsGateway } from '@/test/mocks/notifications-gateway.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from './gateway/notifications.gateway';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsGateway,
          useValue: mockNotificationsGateway,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    prisma = module.get<PrismaService>(PrismaService);

    // Mock default notification preferences (all enabled)
    mockPrismaService.notificationPreferences.findUnique.mockResolvedValue({
      id: 'pref-123',
      userId: 'user-123',
      emailTradeProposal: true,
      emailTradeAccepted: true,
      emailTradeRejected: true,
      emailTradeCancelled: true,
      emailNewMessage: true,
      emailNewComment: true,
      emailNewLike: true,
      emailNewReview: true,
      pushTradeProposal: true,
      pushTradeAccepted: true,
      pushTradeRejected: true,
      pushTradeCancelled: true,
      pushNewMessage: true,
      pushNewComment: true,
      pushNewLike: true,
      pushNewReview: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createNotification', () => {
    it('should create a notification successfully', async () => {
      const createDto = {
        type: NotificationType.TRADE_PROPOSAL,
        title: 'New Trade Proposal',
        message: 'John wants to trade with you',
        userId: 'user-456',
        metadata: { tradeId: 'trade-123' },
      };

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createNotification(createDto);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: createDto,
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should return all notifications for a user', async () => {
      const userId = 'user-456';

      mockPrismaService.notification.findMany.mockResolvedValue(
        mockNotifications,
      );

      const result = await service.getUserNotifications(userId);

      expect(result).toHaveLength(3);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).toHaveProperty('title');
      expect(result[0]).toHaveProperty('message');
      expect(result[0]).toHaveProperty('isRead');
      expect(result[0]).toHaveProperty('metadata');
      expect(result[0]).toHaveProperty('createdAt');
      expect(result[0]).not.toHaveProperty('userId'); // userId not in response DTO
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return only unread notifications when unreadOnly is true', async () => {
      const userId = 'user-456';

      mockPrismaService.notification.findMany.mockResolvedValue(
        mockUnreadNotifications,
      );

      const result = await service.getUserNotifications(userId, true);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('type');
      expect(result[0]).not.toHaveProperty('userId'); // userId not in response DTO
      expect(prisma.notification.findMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('getUnreadCount', () => {
    const userId = 'user-456';

    it('should return cached count when cache hit', async () => {
      mockCacheService.get.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `users:${userId}:notifications:unread`,
      );
      expect(prisma.notification.count).not.toHaveBeenCalled(); // DB not queried on cache hit
      expect(result).toBe(5);
    });

    it('should query database and cache result when cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss
      mockPrismaService.notification.count.mockResolvedValue(5);

      const result = await service.getUnreadCount(userId);

      expect(mockCacheService.get).toHaveBeenCalledWith(
        `users:${userId}:notifications:unread`,
      );
      expect(prisma.notification.count).toHaveBeenCalledWith({
        where: { userId, isRead: false },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `users:${userId}:notifications:unread`,
        5,
        60000, // 1 minute
      );
      expect(result).toBe(5);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-456';

      mockPrismaService.notification.findUnique.mockResolvedValue(
        mockNotification,
      );
      mockPrismaService.notification.update.mockResolvedValue(
        mockReadNotification,
      );

      await service.markAsRead(notificationId, userId);

      expect(prisma.notification.update).toHaveBeenCalledWith({
        where: { id: notificationId },
        data: { isRead: true },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      const notificationId = 'non-existent';
      const userId = 'user-456';

      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user does not own notification', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-999'; // different user

      mockPrismaService.notification.findUnique.mockResolvedValue(
        mockNotification,
      );

      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      const userId = 'user-456';

      mockPrismaService.notification.updateMany.mockResolvedValue({ count: 3 });

      await service.markAllAsRead(userId);

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId, isRead: false },
        data: { isRead: true },
      });
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-456';

      mockPrismaService.notification.findUnique.mockResolvedValue(
        mockNotification,
      );
      mockPrismaService.notification.delete.mockResolvedValue(mockNotification);

      await service.deleteNotification(notificationId, userId);

      expect(prisma.notification.delete).toHaveBeenCalledWith({
        where: { id: notificationId },
      });
    });

    it('should throw NotFoundException when notification not found', async () => {
      const notificationId = 'non-existent';
      const userId = 'user-456';

      mockPrismaService.notification.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteNotification(notificationId, userId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when user does not own notification', async () => {
      const notificationId = 'notification-123';
      const userId = 'user-999'; // different user

      mockPrismaService.notification.findUnique.mockResolvedValue(
        mockNotification,
      );

      await expect(
        service.deleteNotification(notificationId, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('createTradeNotification', () => {
    it('should create TRADE_PROPOSAL notification', async () => {
      const recipientId = 'user-456';
      const trade = mockTradeWithRelations;

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_PROPOSAL,
        recipientId,
        trade,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.TRADE_PROPOSAL,
          userId: recipientId,
          title: 'New Trade Proposal',
          message: expect.stringContaining('wants to trade'),
        }),
      });
    });

    it('should create TRADE_ACCEPTED notification', async () => {
      const recipientId = 'user-123';
      const trade = mockTradeWithRelations;

      mockPrismaService.notification.create.mockResolvedValue(
        mockTradeAcceptedNotification,
      );

      await service.createTradeNotification(
        NotificationType.TRADE_ACCEPTED,
        recipientId,
        trade,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.TRADE_ACCEPTED,
          userId: recipientId,
          title: 'Trade Accepted',
          message: expect.stringContaining('accepted your trade proposal'),
        }),
      });
    });

    it('should create TRADE_REJECTED notification', async () => {
      const recipientId = 'user-123';
      const trade = mockTradeWithRelations;

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_REJECTED,
        recipientId,
        trade,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.TRADE_REJECTED,
          userId: recipientId,
          title: 'Trade Rejected',
          message: expect.stringContaining('rejected your trade proposal'),
        }),
      });
    });

    it('should create TRADE_COMPLETED notification', async () => {
      const recipientId = 'user-123';
      const trade = mockTradeWithRelations;

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_COMPLETED,
        recipientId,
        trade,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.TRADE_COMPLETED,
          userId: recipientId,
          title: 'Trade Completed',
          message: expect.stringContaining('has been completed successfully'),
        }),
      });
    });

    it('should create TRADE_CANCELLED notification', async () => {
      const recipientId = 'user-123';
      const trade = mockTradeWithRelations;

      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_CANCELLED,
        recipientId,
        trade,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.TRADE_CANCELLED,
          userId: recipientId,
          title: 'Trade Cancelled',
          message: expect.stringContaining('cancelled the trade proposal'),
        }),
      });
    });

    it('should return early for unknown notification type', async () => {
      const recipientId = 'user-123';
      const trade = mockTradeWithRelations;

      await service.createTradeNotification(
        'UNKNOWN_TYPE' as NotificationType,
        recipientId,
        trade,
      );

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should not create notification if user preferences disabled', async () => {
      const recipientId = 'user-123';

      // Mock preferences with push notifications disabled
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValueOnce(
        {
          id: 'pref-123',
          userId: recipientId,
          pushTradeProposal: false,
          emailTradeProposal: true,
          pushTradeAccepted: false,
          pushTradeRejected: false,
          pushTradeCancelled: false,
          pushNewMessage: false,
          pushNewComment: false,
          pushNewLike: false,
          pushNewReview: false,
          emailTradeAccepted: true,
          emailTradeRejected: true,
          emailTradeCancelled: true,
          emailNewMessage: true,
          emailNewComment: true,
          emailNewLike: true,
          emailNewReview: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      const result = await service.createNotification({
        type: NotificationType.TRADE_PROPOSAL,
        title: 'New Trade Proposal',
        message: 'You have a new trade proposal',
        userId: recipientId,
      });

      expect(result).toBeNull();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it('should send email for TRADE_PROPOSAL', async () => {
      const recipientId = 'user-123';
      const trade = {
        ...mockTradeWithRelations,
        responder: {
          id: recipientId,
          username: 'responder',
          email: 'resp@test.com',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(trade.responder);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_PROPOSAL,
        recipientId,
        trade,
      );

      expect(mockMailService.sendTradeProposal).toHaveBeenCalledWith(
        'resp@test.com',
        'responder',
        expect.objectContaining({
          proposerName: trade.proposer.username,
          offeredItemName: trade.itemOffered.title,
          requestedItemName: trade.itemRequested.title,
          tradeId: trade.id,
        }),
      );
    });

    it('should send email for TRADE_ACCEPTED', async () => {
      const recipientId = 'user-123';
      const trade = {
        ...mockTradeWithRelations,
        proposer: {
          id: recipientId,
          username: 'proposer',
          email: 'prop@test.com',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(trade.proposer);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_ACCEPTED,
        recipientId,
        trade,
      );

      expect(mockMailService.sendTradeAccepted).toHaveBeenCalledWith(
        'prop@test.com',
        'proposer',
        expect.objectContaining({
          responderName: trade.responder.username,
          tradeId: trade.id,
        }),
      );
    });

    it('should send email for TRADE_REJECTED', async () => {
      const recipientId = 'user-123';
      const trade = {
        ...mockTradeWithRelations,
        proposer: {
          id: recipientId,
          username: 'proposer',
          email: 'prop@test.com',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(trade.proposer);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_REJECTED,
        recipientId,
        trade,
      );

      expect(mockMailService.sendTradeRejected).toHaveBeenCalledWith(
        'prop@test.com',
        'proposer',
        expect.objectContaining({
          responderName: trade.responder.username,
          tradeId: trade.id,
        }),
      );
    });

    it('should send email for TRADE_CANCELLED', async () => {
      const recipientId = 'user-123';
      const trade = {
        ...mockTradeWithRelations,
        responder: {
          id: recipientId,
          username: 'responder',
          email: 'resp@test.com',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(trade.responder);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_CANCELLED,
        recipientId,
        trade,
      );

      expect(mockMailService.sendTradeCancelled).toHaveBeenCalledWith(
        'resp@test.com',
        'responder',
        expect.objectContaining({
          proposerName: trade.proposer.username,
          tradeId: trade.id,
        }),
      );
    });

    it('should handle email send errors gracefully', async () => {
      const recipientId = 'user-123';
      const trade = {
        ...mockTradeWithRelations,
        responder: {
          id: recipientId,
          username: 'responder',
          email: 'resp@test.com',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(trade.responder);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);
      mockMailService.sendTradeProposal.mockRejectedValue(
        new Error('Email service down'),
      );

      // Should not throw
      await expect(
        service.createTradeNotification(
          NotificationType.TRADE_PROPOSAL,
          recipientId,
          trade,
        ),
      ).resolves.not.toThrow();
    });

    it('should return early if recipient not found', async () => {
      const recipientId = 'user-123';
      const trade = mockTradeWithRelations;

      mockPrismaService.user.findUnique.mockResolvedValue(null);
      mockPrismaService.notification.create.mockResolvedValue(mockNotification);

      await service.createTradeNotification(
        NotificationType.TRADE_PROPOSAL,
        recipientId,
        trade,
      );

      expect(mockMailService.sendTradeProposal).not.toHaveBeenCalled();
    });
  });

  describe('shouldSendEmail', () => {
    it('should return true for TRADE_PROPOSAL when email preference enabled', async () => {
      const result = await (service as any).shouldSendEmail(
        'user-123',
        NotificationType.TRADE_PROPOSAL,
      );
      expect(result).toBe(true);
    });

    it('should return false for TRADE_PROPOSAL when email preference disabled', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValueOnce(
        {
          id: 'pref-123',
          userId: 'user-123',
          emailTradeProposal: false,
          emailTradeAccepted: true,
          emailTradeRejected: true,
          emailTradeCancelled: true,
          emailNewMessage: true,
          emailNewComment: true,
          emailNewLike: true,
          emailNewReview: true,
          pushTradeProposal: true,
          pushTradeAccepted: true,
          pushTradeRejected: true,
          pushTradeCancelled: true,
          pushNewMessage: true,
          pushNewComment: true,
          pushNewLike: true,
          pushNewReview: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      const result = await (service as any).shouldSendEmail(
        'user-123',
        NotificationType.TRADE_PROPOSAL,
      );
      expect(result).toBe(false);
    });

    it('should return true by default for unknown notification type', async () => {
      const result = await (service as any).shouldSendEmail(
        'user-123',
        'UNKNOWN_TYPE' as NotificationType,
      );
      expect(result).toBe(true);
    });
  });

  describe('shouldSendPush', () => {
    it('should return true for TRADE_ACCEPTED when push preference enabled', async () => {
      const result = await (service as any).shouldSendPush(
        'user-123',
        NotificationType.TRADE_ACCEPTED,
      );
      expect(result).toBe(true);
    });

    it('should return false for TRADE_REJECTED when push preference disabled', async () => {
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValueOnce(
        {
          id: 'pref-123',
          userId: 'user-123',
          emailTradeProposal: true,
          emailTradeAccepted: true,
          emailTradeRejected: true,
          emailTradeCancelled: true,
          emailNewMessage: true,
          emailNewComment: true,
          emailNewLike: true,
          emailNewReview: true,
          pushTradeProposal: true,
          pushTradeAccepted: true,
          pushTradeRejected: false,
          pushTradeCancelled: true,
          pushNewMessage: true,
          pushNewComment: true,
          pushNewLike: true,
          pushNewReview: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      const result = await (service as any).shouldSendPush(
        'user-123',
        NotificationType.TRADE_REJECTED,
      );
      expect(result).toBe(false);
    });

    it('should return true by default for unknown notification type', async () => {
      const result = await (service as any).shouldSendPush(
        'user-123',
        'UNKNOWN_TYPE' as NotificationType,
      );
      expect(result).toBe(true);
    });
  });

  describe('shouldSendEmail - additional notification types', () => {
    it('should check preference for NEW_MESSAGE', async () => {
      const result = await (service as any).shouldSendEmail(
        'user-123',
        NotificationType.NEW_MESSAGE,
      );
      expect(result).toBe(true);
    });

    it('should check preference for NEW_COMMENT', async () => {
      const result = await (service as any).shouldSendEmail(
        'user-123',
        NotificationType.NEW_COMMENT,
      );
      expect(result).toBe(true);
    });

    it('should check preference for NEW_LIKE', async () => {
      const result = await (service as any).shouldSendEmail(
        'user-123',
        NotificationType.NEW_LIKE,
      );
      expect(result).toBe(true);
    });

    it('should check preference for NEW_REVIEW', async () => {
      const result = await (service as any).shouldSendEmail(
        'user-123',
        NotificationType.NEW_REVIEW,
      );
      expect(result).toBe(true);
    });
  });

  describe('shouldSendPush - additional notification types', () => {
    it('should check preference for NEW_MESSAGE', async () => {
      const result = await (service as any).shouldSendPush(
        'user-123',
        NotificationType.NEW_MESSAGE,
      );
      expect(result).toBe(true);
    });

    it('should check preference for NEW_COMMENT', async () => {
      const result = await (service as any).shouldSendPush(
        'user-123',
        NotificationType.NEW_COMMENT,
      );
      expect(result).toBe(true);
    });

    it('should check preference for NEW_LIKE', async () => {
      const result = await (service as any).shouldSendPush(
        'user-123',
        NotificationType.NEW_LIKE,
      );
      expect(result).toBe(true);
    });

    it('should check preference for NEW_REVIEW', async () => {
      const result = await (service as any).shouldSendPush(
        'user-123',
        NotificationType.NEW_REVIEW,
      );
      expect(result).toBe(true);
    });
  });

  describe('sendTradeEmail - edge cases', () => {
    it('should return early when email preference disabled', async () => {
      const recipientId = 'user-123';
      const trade = mockTradeWithRelations;

      // Mock shouldSendEmail to return false
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValueOnce(
        {
          id: 'pref-123',
          userId: recipientId,
          emailTradeProposal: false,
          emailTradeAccepted: false,
          emailTradeRejected: false,
          emailTradeCancelled: false,
          emailNewMessage: false,
          emailNewComment: false,
          emailNewLike: false,
          emailNewReview: false,
          pushTradeProposal: true,
          pushTradeAccepted: true,
          pushTradeRejected: true,
          pushTradeCancelled: true,
          pushNewMessage: true,
          pushNewComment: true,
          pushNewLike: true,
          pushNewReview: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      );

      await (service as any).sendTradeEmail(
        NotificationType.TRADE_PROPOSAL,
        recipientId,
        trade,
      );

      // User.findUnique should not be called since we return early
      expect(mockPrismaService.user.findUnique).not.toHaveBeenCalled();
    });

    it('should handle default case in email switch statement', async () => {
      const recipientId = 'user-123';
      const trade = {
        ...mockTradeWithRelations,
        responder: {
          id: recipientId,
          username: 'responder',
          email: 'resp@test.com',
        },
      };

      mockPrismaService.user.findUnique.mockResolvedValue(trade.responder);

      // Use a notification type that hits the default case
      await (service as any).sendTradeEmail(
        'UNKNOWN_TYPE' as NotificationType,
        recipientId,
        trade,
      );

      // Should not call any mail service methods for unknown type
      expect(mockMailService.sendTradeProposal).not.toHaveBeenCalled();
      expect(mockMailService.sendTradeAccepted).not.toHaveBeenCalled();
      expect(mockMailService.sendTradeRejected).not.toHaveBeenCalled();
      expect(mockMailService.sendTradeCancelled).not.toHaveBeenCalled();
    });
  });

  describe('getPreferences', () => {
    it('should create default preferences if none exist', async () => {
      const userId = 'user-123';
      const defaultPreferences = {
        id: 'pref-new',
        userId,
        emailTradeProposal: true,
        emailTradeAccepted: true,
        emailTradeRejected: true,
        emailTradeCancelled: true,
        emailNewMessage: true,
        emailNewComment: true,
        emailNewLike: true,
        emailNewReview: true,
        pushTradeProposal: true,
        pushTradeAccepted: true,
        pushTradeRejected: true,
        pushTradeCancelled: true,
        pushNewMessage: true,
        pushNewComment: true,
        pushNewLike: true,
        pushNewReview: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // First call returns null (no preferences exist)
      mockPrismaService.notificationPreferences.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(defaultPreferences);

      // Create returns the default preferences
      mockPrismaService.notificationPreferences.create.mockResolvedValue(
        defaultPreferences,
      );

      const result = await service.getPreferences(userId);

      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(
        mockPrismaService.notificationPreferences.create,
      ).toHaveBeenCalledWith({
        data: { userId },
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update notification preferences', async () => {
      const userId = 'user-123';
      const updateData = {
        emailTradeProposal: false,
        pushNewMessage: false,
      };
      const updatedPreferences = {
        id: 'pref-123',
        userId,
        emailTradeProposal: false,
        emailTradeAccepted: true,
        emailTradeRejected: true,
        emailTradeCancelled: true,
        emailNewMessage: true,
        emailNewComment: true,
        emailNewLike: true,
        emailNewReview: true,
        pushTradeProposal: true,
        pushTradeAccepted: true,
        pushTradeRejected: true,
        pushTradeCancelled: true,
        pushNewMessage: false,
        pushNewComment: true,
        pushNewLike: true,
        pushNewReview: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue({
        id: 'pref-123',
        userId,
        emailTradeProposal: true,
        emailTradeAccepted: true,
        emailTradeRejected: true,
        emailTradeCancelled: true,
        emailNewMessage: true,
        emailNewComment: true,
        emailNewLike: true,
        emailNewReview: true,
        pushTradeProposal: true,
        pushTradeAccepted: true,
        pushTradeRejected: true,
        pushTradeCancelled: true,
        pushNewMessage: true,
        pushNewComment: true,
        pushNewLike: true,
        pushNewReview: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrismaService.notificationPreferences.update.mockResolvedValue(
        updatedPreferences,
      );

      const result = await service.updatePreferences(userId, updateData);

      expect(result).toEqual(updatedPreferences);
      expect(
        mockPrismaService.notificationPreferences.update,
      ).toHaveBeenCalledWith({
        where: { userId },
        data: updateData,
      });
    });
  });
});

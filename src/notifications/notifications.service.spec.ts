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
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { NotificationType } from '@prisma/client';
import { NotificationsGateway } from './gateway/notifications.gateway';

const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn(),
  del: jest.fn(),
  getUnreadNotificationsKey: jest.fn(
    (userId) => `users:${userId}:notifications:unread`,
  ),
};

describe('NotificationsService', () => {
  let service: NotificationsService;
  let prisma: PrismaService;

  const mockNotificationsGateway = {
    emitNotificationToUser: jest.fn(),
    emitNotificationRead: jest.fn(),
    emitAllNotificationsRead: jest.fn(),
    emitNotificationDeleted: jest.fn(),
  };

  const mockMailService = {
    sendTradeProposal: jest.fn(),
    sendTradeAccepted: jest.fn(),
    sendTradeRejected: jest.fn(),
    sendTradeCancelled: jest.fn(),
    sendWelcomeEmail: jest.fn(),
  };

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

      expect(mockCacheService.getUnreadNotificationsKey).toHaveBeenCalledWith(
        userId,
      );
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
  });
});

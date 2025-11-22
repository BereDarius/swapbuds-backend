import {
  mockNotifications,
  mockUnreadNotifications,
} from '@/test/fixtures/notification.fixture';
import { Test, TestingModule } from '@nestjs/testing';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

// Mock NotificationsService
const mockNotificationsService = {
  createTradeNotification: jest.fn(),
  createNotification: jest.fn(),
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
};

describe('NotificationsController', () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getNotifications', () => {
    it('should return all notifications for user', async () => {
      const userId = 'user-456';
      mockNotificationsService.getUserNotifications.mockResolvedValue(
        mockNotifications,
      );

      const result = await controller.getNotifications(userId, undefined);

      expect(result).toEqual(mockNotifications);
      expect(service.getUserNotifications).toHaveBeenCalledWith(userId, false);
    });

    it('should return only unread notifications when unreadOnly is true', async () => {
      const userId = 'user-456';
      mockNotificationsService.getUserNotifications.mockResolvedValue(
        mockUnreadNotifications,
      );

      const result = await controller.getNotifications(userId, 'true');

      expect(result).toEqual(mockUnreadNotifications);
      expect(service.getUserNotifications).toHaveBeenCalledWith(userId, true);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count of unread notifications', async () => {
      const userId = 'user-456';
      mockNotificationsService.getUnreadCount.mockResolvedValue(5);

      const result = await controller.getUnreadCount(userId);

      expect(result).toEqual({ count: 5 });
      expect(service.getUnreadCount).toHaveBeenCalledWith(userId);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      const userId = 'user-456';
      const notificationId = 'notification-123';

      mockNotificationsService.markAsRead.mockResolvedValue(undefined);

      await controller.markAsRead(notificationId, userId);

      expect(service.markAsRead).toHaveBeenCalledWith(notificationId, userId);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read for user', async () => {
      const userId = 'user-456';

      mockNotificationsService.markAllAsRead.mockResolvedValue(undefined);

      await controller.markAllAsRead(userId);

      expect(service.markAllAsRead).toHaveBeenCalledWith(userId);
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      const userId = 'user-456';
      const notificationId = 'notification-123';

      mockNotificationsService.deleteNotification.mockResolvedValue(undefined);

      await controller.deleteNotification(notificationId, userId);

      expect(service.deleteNotification).toHaveBeenCalledWith(
        notificationId,
        userId,
      );
    });
  });
});

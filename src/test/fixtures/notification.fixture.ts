import { NotificationType } from '@prisma/client';

/**
 * Mock notification for testing
 */
export const mockNotification = {
  id: 'notification-123',
  type: NotificationType.TRADE_PROPOSAL,
  title: 'New Trade Proposal',
  message: 'John wants to trade "iPhone 12" for your "Samsung Galaxy S21"',
  userId: 'user-456',
  metadata: {
    tradeId: 'trade-123',
    proposerId: 'user-123',
    itemOfferedId: 'item-123',
    itemRequestedId: 'item-456',
  },
  isRead: false,
  createdAt: new Date('2024-01-15T10:00:00Z'),
};

/**
 * Mock read notification
 */
export const mockReadNotification = {
  ...mockNotification,
  id: 'notification-124',
  isRead: true,
};

/**
 * Mock trade accepted notification
 */
export const mockTradeAcceptedNotification = {
  id: 'notification-125',
  type: NotificationType.TRADE_ACCEPTED,
  title: 'Trade Accepted',
  message: 'Jane accepted your trade proposal for "Samsung Galaxy S21"',
  userId: 'user-123',
  metadata: {
    tradeId: 'trade-123',
    responderId: 'user-456',
    itemRequestedId: 'item-456',
  },
  isRead: false,
  createdAt: new Date('2024-01-15T11:00:00Z'),
};

/**
 * Mock trade rejected notification
 */
export const mockTradeRejectedNotification = {
  id: 'notification-126',
  type: NotificationType.TRADE_REJECTED,
  title: 'Trade Rejected',
  message: 'Jane rejected your trade proposal for "Samsung Galaxy S21"',
  userId: 'user-123',
  metadata: {
    tradeId: 'trade-123',
    responderId: 'user-456',
    itemRequestedId: 'item-456',
  },
  isRead: false,
  createdAt: new Date('2024-01-15T11:30:00Z'),
};

/**
 * Mock array of notifications
 */
export const mockNotifications = [
  mockNotification,
  mockReadNotification,
  mockTradeAcceptedNotification,
];

/**
 * Mock array of unread notifications
 */
export const mockUnreadNotifications = [
  mockNotification,
  mockTradeAcceptedNotification,
];

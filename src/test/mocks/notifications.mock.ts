/**
 * Mock NotificationsService for unit tests
 */
export const mockNotificationsService = {
  create: jest.fn(),
  createNotification: jest.fn(),
  createTradeNotification: jest.fn(),
  findAll: jest.fn(),
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  delete: jest.fn(),
  deleteNotification: jest.fn(),
  getUnreadCount: jest.fn(),
  notifyAdminsOfVerificationSubmission: jest.fn(),
  getPreferences: jest.fn(),
  updatePreferences: jest.fn(),
};

/**
 * Reset all notifications service mocks
 */
export const resetNotificationsMocks = () => {
  Object.values(mockNotificationsService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

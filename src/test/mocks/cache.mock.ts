/**
 * Mock CacheService for unit tests
 */
export const mockCacheService = {
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
  reset: jest.fn().mockResolvedValue(undefined),
  keys: jest.fn().mockResolvedValue([]),
  ttl: jest.fn().mockResolvedValue(0),
  // Key generator methods - Users
  getUserKey: jest.fn((userId) => `users:${userId}`),
  // Key generator methods - Items
  invalidateItem: jest.fn(),
  getItemsListKey: jest.fn((page, limit) => `items:list:${page}:${limit}:all`),
  getItemKey: jest.fn((itemId) => `items:${itemId}`),
  getUserItemsKey: jest.fn((userId) => `users:${userId}:items`),
  // Key generator methods - Notifications
  getUnreadNotificationsKey: jest.fn(
    (userId) => `users:${userId}:notifications:unread`,
  ),
};

/**
 * Reset all cache service mocks
 */
export const resetCacheMocks = () => {
  Object.values(mockCacheService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

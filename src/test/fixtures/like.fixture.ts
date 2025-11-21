/**
 * Test fixtures for Like entities
 */
export const mockLike = {
  id: 'like-1',
  userId: 'user-1',
  itemId: 'item-1',
  createdAt: new Date('2024-01-01'),
};

export const mockLikeWithUser = {
  ...mockLike,
  user: {
    id: 'user-1',
    username: 'testuser',
    avatarUrl: null,
  },
};

export const mockLikes = [
  mockLike,
  {
    ...mockLike,
    id: 'like-2',
    userId: 'user-2',
  },
];

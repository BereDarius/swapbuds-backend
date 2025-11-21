/**
 * Test fixtures for Comment entities
 */
export const mockComment = {
  id: 'comment-1',
  content: 'Test comment',
  userId: 'user-1',
  itemId: 'item-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockCommentWithUser = {
  ...mockComment,
  user: {
    username: 'testuser',
    avatarUrl: null,
  },
};

export const mockComments = [
  mockCommentWithUser,
  {
    ...mockCommentWithUser,
    id: 'comment-2',
    content: 'Another test comment',
    userId: 'user-2',
    user: {
      username: 'testuser2',
      avatarUrl: null,
    },
  },
];

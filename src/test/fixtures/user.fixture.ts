/**
 * Test fixtures for User entities
 */
export const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  username: 'testuser',
  password: '$2b$10$hashedpassword',
  avatarUrl: null,
  bio: null,
  location: null,
  reputationScore: 0,
  isActive: true,
  isVerified: false,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLoginAt: null,
};

export const mockUserWithProfile = {
  ...mockUser,
  avatarUrl: 'https://cloudinary.com/avatar.jpg',
  bio: 'Test user bio',
  location: 'Test City',
  reputationScore: 4.5,
};

export const mockUsers = [
  mockUser,
  {
    ...mockUser,
    id: 'user-2',
    email: 'test2@example.com',
    username: 'testuser2',
  },
];

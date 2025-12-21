import { AdminRole } from '@prisma/client';

/**
 * Mock AdminUser data for tests
 */
export const mockAdminUser = {
  id: 'admin-1',
  email: 'admin@swapbuds.com',
  username: 'admin_user',
  password: '$2b$12$hashedpassword', // Hashed password
  avatarUrl: null,
  role: AdminRole.ADMIN,
  createdBy: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-15'),
  isActive: true,
  mfaEnabled: true,
};

export const mockModeratorUser = {
  id: 'moderator-1',
  email: 'moderator@swapbuds.com',
  username: 'moderator_user',
  password: '$2b$12$hashedpassword',
  avatarUrl: null,
  role: AdminRole.MODERATOR,
  createdBy: 'admin-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-15'),
  isActive: true,
  mfaEnabled: true,
};

export const mockSupportUser = {
  id: 'support-1',
  email: 'support@swapbuds.com',
  username: 'support_user',
  password: '$2b$12$hashedpassword',
  avatarUrl: null,
  role: AdminRole.SUPPORT,
  createdBy: 'admin-1',
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  lastLoginAt: new Date('2024-01-15'),
  isActive: true,
  mfaEnabled: true,
};

/**
 * Mock AdminMFASecret
 */
export const mockAdminMFASecret = {
  id: 'mfa-admin-1',
  adminUserId: 'admin-1',
  secret: 'MOCK_ADMIN_MFA_SECRET',
  createdAt: new Date('2024-01-01'),
};

/**
 * Mock AdminAuth service
 */
export const mockAdminAuthService = {
  login: jest.fn(),
  register: jest.fn(),
  setupMFA: jest.fn(),
  verifyAndEnableMFA: jest.fn(),
};

export function resetAdminUserMocks() {
  Object.values(mockAdminAuthService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

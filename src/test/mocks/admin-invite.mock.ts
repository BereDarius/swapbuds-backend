import { AdminInviteStatus, AdminRole } from '@prisma/client';

// Re-export mockAdminUser from admin-user.mock.ts for convenience
export { mockAdminUser } from './admin-user.mock';

/**
 * Mock AdminInviteService for tests
 */
export const mockAdminInviteService = {
  createInvite: jest.fn(),
  getAllInvites: jest.fn(),
  getInviteByToken: jest.fn(),
  acceptInvite: jest.fn(),
  approveInvite: jest.fn(),
  rejectInvite: jest.fn(),
  revokeInvite: jest.fn(),
  cleanupExpiredInvites: jest.fn(),
};

export function resetAdminInviteServiceMocks() {
  Object.values(mockAdminInviteService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

/**
 * Mock admin invite data
 */
export const mockAdminInvite = {
  id: 'invite-1',
  email: 'newadmin@swapbuds.com',
  username: 'new_admin',
  role: AdminRole.SUPPORT,
  token: 'invite-token-123',
  status: AdminInviteStatus.PENDING,
  expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  sentBy: 'admin-1', // Foreign key field
  sentAt: new Date('2024-01-15'),
  acceptedAt: null,
  approvedBy: null,
  approvedAt: null,
  rejectedAt: null,
  revokedAt: null,
  rejectionReason: null,
  recipientId: null,
  sender: {
    id: 'admin-1',
    username: 'admin_user',
    email: 'admin@swapbuds.com',
    role: AdminRole.ADMIN,
  },
  approver: null,
  recipient: null,
};

export const mockAcceptedInvite = {
  ...mockAdminInvite,
  id: 'invite-2',
  status: AdminInviteStatus.ACCEPTED,
  acceptedAt: new Date('2024-01-16'),
};

export const mockApprovedInvite = {
  ...mockAcceptedInvite,
  id: 'invite-3',
  status: AdminInviteStatus.APPROVED,
  approvedAt: new Date('2024-01-17'),
  approvedById: 'admin-1',
  recipientId: 'new-admin-1',
};

export const mockRejectedInvite = {
  ...mockAcceptedInvite,
  id: 'invite-4',
  status: AdminInviteStatus.REJECTED,
  rejectedAt: new Date('2024-01-17'),
  approvedById: 'admin-1',
  rejectionReason: 'Not qualified',
};

export const mockRevokedInvite = {
  ...mockAdminInvite,
  id: 'invite-5',
  status: AdminInviteStatus.REVOKED,
  revokedAt: new Date('2024-01-16'),
};

export const mockExpiredInvite = {
  ...mockAdminInvite,
  id: 'invite-6',
  status: AdminInviteStatus.EXPIRED,
  expiresAt: new Date(Date.now() - 1000),
};

/**
 * Mock request object for tests
 */
export const mockAdminInviteRequest = {
  user: {
    id: 'admin-1',
    sub: 'admin-1',
    username: 'admin_user',
    email: 'admin@swapbuds.com',
    role: AdminRole.ADMIN,
  },
};

export const mockModeratorInviteRequest = {
  user: {
    id: 'moderator-1',
    sub: 'moderator-1',
    username: 'moderator_user',
    email: 'moderator@swapbuds.com',
    role: AdminRole.MODERATOR,
  },
};

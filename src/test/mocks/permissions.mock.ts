import { PermissionCategory } from '@prisma/client';

/**
 * Mock PermissionsService for tests
 */
export const mockPermissionsService = {
  getAllPermissions: jest.fn(),
  getPermissionsByCategory: jest.fn(),
  getAdminPermissions: jest.fn(),
  grantPermissions: jest.fn(),
  revokePermissions: jest.fn(),
  revokeAllPermissions: jest.fn(),
  hasPermission: jest.fn(),
  hasAllPermissions: jest.fn(),
};

export function resetPermissionsServiceMocks() {
  Object.values(mockPermissionsService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

/**
 * Mock admin request object for controller tests
 */
export const mockAdminRequest = {
  user: {
    sub: 'admin-123',
    email: 'admin@example.com',
    username: 'admin',
    role: 'ADMIN',
  },
};

/**
 * Mock permissions data
 */
export const mockPermissions = [
  {
    id: '1',
    name: 'tickets:view',
    description: 'View support tickets',
    category: PermissionCategory.TICKETS,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '2',
    name: 'tickets:assign',
    description: 'Assign tickets to agents',
    category: PermissionCategory.TICKETS,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '3',
    name: 'moderation:flags_view',
    description: 'View flagged content',
    category: PermissionCategory.MODERATION,
    createdAt: new Date('2024-01-01'),
  },
  {
    id: '4',
    name: 'users:edit',
    description: 'Edit user accounts',
    category: PermissionCategory.USERS,
    createdAt: new Date('2024-01-01'),
  },
];

/**
 * Mock admin permissions response
 */
export const mockAdminPermissionsResponse = {
  adminUser: {
    id: 'admin-1',
    username: 'admin',
    role: 'ADMIN',
  },
  hasAllPermissions: true,
  permissions: mockPermissions,
};

/**
 * Mock support user permissions response
 */
export const mockSupportPermissionsResponse = {
  adminUser: {
    id: 'support-1',
    username: 'support',
    role: 'SUPPORT',
  },
  hasAllPermissions: false,
  permissions: [mockPermissions[0]], // Only tickets:view
};

export const mockAdminService = {
  getStats: jest.fn(),
  getAllUsers: jest.fn(),
  getUserDetails: jest.fn(),
  banUser: jest.fn(),
  unbanUser: jest.fn(),
  updateUserRole: jest.fn(),
  deleteUser: jest.fn(),
  getSystemHealth: jest.fn(),
  clearCache: jest.fn(),
  getPlatformStats: jest.fn(),
  getUsers: jest.fn(),
  changeUserRole: jest.fn(),
  bulkBanUsers: jest.fn(),
  bulkUnbanUsers: jest.fn(),
  bulkChangeRole: jest.fn(),
};

export function resetAdminServiceMocks() {
  Object.values(mockAdminService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

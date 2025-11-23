export const mockUsersService = {
  findAllFiltered: jest.fn(),
  getUserProfile: jest.fn(),
  updateProfile: jest.fn(),
  uploadAvatar: jest.fn(),
  getUserStatistics: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getUserSettings: jest.fn(),
  updateUserSettings: jest.fn(),
  requestDataExport: jest.fn(),
  deleteAccount: jest.fn(),
};

export const resetUsersMocks = () => {
  Object.values(mockUsersService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

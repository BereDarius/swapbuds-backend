export const mockModerationService = {
  flagItem: jest.fn(),
  getFlaggedItems: jest.fn(),
  getFlaggedItem: jest.fn(),
  approveItem: jest.fn(),
  removeItem: jest.fn(),
  getModerationStats: jest.fn(),
  reviewFlag: jest.fn(),
  bulkApprove: jest.fn(),
  bulkReject: jest.fn(),
  bulkRemove: jest.fn(),
};

export const resetModerationMocks = () => {
  Object.values(mockModerationService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

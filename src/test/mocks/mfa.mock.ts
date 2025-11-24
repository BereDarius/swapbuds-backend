export const mockMfaService = {
  setupMFA: jest.fn(),
  verifyAndEnableMFA: jest.fn(),
  verifyMFACode: jest.fn(),
  disableMFA: jest.fn(),
  regenerateBackupCodes: jest.fn(),
  isMFAEnabled: jest.fn(),
};

export const resetMfaMocks = () => {
  Object.values(mockMfaService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

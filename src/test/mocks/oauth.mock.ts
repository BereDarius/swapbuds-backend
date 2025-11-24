export const mockOAuthService = {
  handleOAuthCallback: jest.fn(),
  generateOAuthToken: jest.fn(),
  linkOAuthAccount: jest.fn(),
  unlinkOAuthAccount: jest.fn(),
  getLinkedAccounts: jest.fn(),
  generateUniqueUsername: jest.fn(),
  encryptToken: jest.fn(),
  decryptToken: jest.fn(),
};

export function resetOAuthServiceMocks() {
  Object.values(mockOAuthService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

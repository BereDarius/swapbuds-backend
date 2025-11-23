/**
 * Mock MailService for unit tests
 */
export const mockMailService = {
  sendVerificationSubmitted: jest.fn(),
  sendVerificationApproved: jest.fn(),
  sendVerificationRejected: jest.fn(),
  sendAccountSuspendedUnderage: jest.fn(),
  sendAdminVerificationAlert: jest.fn(),
  sendTradeProposal: jest.fn(),
  sendTradeAccepted: jest.fn(),
  sendTradeRejected: jest.fn(),
  sendTradeCancelled: jest.fn(),
  sendTradeExpired: jest.fn(),
  sendTradeExpiringWarning: jest.fn(),
  sendPasswordReset: jest.fn(),
  sendEmailVerification: jest.fn(),
  sendWelcomeEmail: jest.fn(),
};

/**
 * Reset all mail service mocks
 */
export const resetMailMocks = () => {
  Object.values(mockMailService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockClear();
    }
  });
};

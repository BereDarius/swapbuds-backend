export const mockEmailService = {
  sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  sendAdminInvite: jest.fn().mockResolvedValue(undefined),
  sendAdminApproval: jest.fn().mockResolvedValue(undefined),
  sendAdminRejection: jest.fn().mockResolvedValue(undefined),
};

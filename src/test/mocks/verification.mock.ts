export const mockVerificationService = {
  submitVerification: jest.fn(),
  getVerificationStatus: jest.fn(),
  approveVerification: jest.fn(),
  rejectVerification: jest.fn(),
  cancelVerification: jest.fn(),
  getVerificationStats: jest.fn(),
  getPendingVerifications: jest.fn(),
  getVerificationById: jest.fn(),
  retryVerification: jest.fn(),
  getDocumentSignedUrl: jest.fn(),
};

export const mockDocumentSecurityService = {
  encryptDocument: jest.fn(),
  decryptDocument: jest.fn(),
  deleteDocument: jest.fn(),
  validateDocument: jest.fn(),
  scanForMalware: jest.fn(),
  encryptUrl: jest.fn((url) => `encrypted:${url}`),
  decryptUrl: jest.fn((url) => url.replace('encrypted:', '')),
  generateSignedUrl: jest.fn((publicId) => `signed:${publicId}`),
  extractPublicId: jest.fn(() => 'public-id-123'),
  isCloudinaryUrl: jest.fn(() => true),
};

export const mockVerificationAuditService = {
  log: jest.fn(),
  getAuditLog: jest.fn(),
  getUserAuditLog: jest.fn(),
  logSubmission: jest.fn(),
  logDocumentAccess: jest.fn(),
  logApproval: jest.fn(),
  logRejection: jest.fn(),
  logUnderageAccountSuspension: jest.fn(),
  logCancellation: jest.fn(),
  logSuspiciousActivity: jest.fn(),
  logDocumentDeletion: jest.fn(),
  logRateLimitViolation: jest.fn(),
};

export const mockVerificationRateLimitService = {
  checkRateLimit: jest.fn(),
  recordAttempt: jest.fn(),
  getRemainingAttempts: jest.fn(),
  resetRateLimit: jest.fn(),
  getRateLimitStats: jest.fn(),
};

export const mockVerificationCleanupService = {
  cleanupExpiredVerifications: jest.fn(),
  cleanupRejectedVerifications: jest.fn(),
  cleanupDocuments: jest.fn(),
};

export function resetVerificationServiceMocks() {
  Object.values(mockVerificationService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockDocumentSecurityService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockVerificationAuditService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockVerificationRateLimitService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockVerificationCleanupService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

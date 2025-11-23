export const mockRecaptchaService = {
  verify: jest.fn(),
  verifyWithScore: jest.fn(),
  verifyToken: jest.fn(),
  isEnabled: jest.fn(),
};

export function resetRecaptchaServiceMocks() {
  Object.values(mockRecaptchaService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

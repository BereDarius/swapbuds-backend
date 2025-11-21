/**
 * Mock JwtService for unit tests
 */
export const mockJwtService = {
  sign: jest.fn(),
  verify: jest.fn(),
  decode: jest.fn(),
};

/**
 * Reset JWT mock functions
 */
export const resetJwtMocks = () => {
  Object.values(mockJwtService).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockReset();
    }
  });
};

/**
 * Mock ConfigService for unit tests
 */
export const mockConfigService = {
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '1h',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
      NODE_ENV: 'test',
    };
    return config[key];
  }),
};

/**
 * Reset config mock functions
 */
export const resetConfigMocks = () => {
  mockConfigService.get.mockReset();
  mockConfigService.get.mockImplementation((key: string) => {
    const config: Record<string, any> = {
      JWT_SECRET: 'test-secret',
      JWT_EXPIRATION: '1h',
      CLOUDINARY_CLOUD_NAME: 'test-cloud',
      CLOUDINARY_API_KEY: 'test-key',
      CLOUDINARY_API_SECRET: 'test-secret',
      NODE_ENV: 'test',
    };
    return config[key];
  });
};

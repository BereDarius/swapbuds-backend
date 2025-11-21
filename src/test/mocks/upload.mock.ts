/**
 * Mock UploadService for unit tests
 */
export const mockUploadService = {
  uploadImage: jest.fn(),
  uploadMultipleImages: jest.fn(),
  deleteImage: jest.fn(),
  deleteMultipleImages: jest.fn(),
  getTransformedUrl: jest.fn(),
};

/**
 * Reset upload mock functions
 */
export const resetUploadMocks = () => {
  Object.values(mockUploadService).forEach((fn) => {
    if (jest.isMockFunction(fn)) {
      fn.mockReset();
    }
  });
};

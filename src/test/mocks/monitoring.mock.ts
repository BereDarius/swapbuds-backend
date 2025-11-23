export const mockMonitoringService = {
  trackRequest: jest.fn(),
  trackError: jest.fn(),
  getStats: jest.fn(),
  getMetrics: jest.fn(),
  getErrors: jest.fn(),
  getPerformanceStats: jest.fn(),
  clearOldData: jest.fn(),
  getPerformanceMetrics: jest.fn(),
  recordMetric: jest.fn(),
  recordApiCall: jest.fn(),
  recordError: jest.fn(),
};

export const resetMonitoringMocks = () => {
  Object.values(mockMonitoringService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

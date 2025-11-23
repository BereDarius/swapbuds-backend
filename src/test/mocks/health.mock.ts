import { HealthIndicatorResult } from '@nestjs/terminus';

export const mockHealthCheckService = {
  check: jest.fn(),
};

export const mockPrismaHealthIndicator = {
  isHealthy: jest.fn(),
  pingCheck: jest.fn(),
};

export const mockMemoryHealthIndicator = {
  checkHeap: jest.fn(),
  checkRSS: jest.fn(),
};

export const mockDiskHealthIndicator = {
  checkStorage: jest.fn(),
};

export const mockRedisHealthIndicator = {
  isHealthy: jest.fn(),
  pingCheck: jest.fn(),
};

export const mockHealthyResult: HealthIndicatorResult = {
  test: {
    status: 'up',
  },
};

export function resetHealthServiceMocks() {
  Object.values(mockHealthCheckService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockPrismaHealthIndicator).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockMemoryHealthIndicator).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockDiskHealthIndicator).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockRedisHealthIndicator).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

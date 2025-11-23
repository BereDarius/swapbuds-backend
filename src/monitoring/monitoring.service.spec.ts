import { Test, TestingModule } from '@nestjs/testing';
import {
  ApiMetric,
  ErrorMetric,
  MonitoringService,
} from './monitoring.service';

describe('MonitoringService', () => {
  let service: MonitoringService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitoringService],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    service.reset(); // Clear any existing metrics
    jest.clearAllMocks();
  });

  afterEach(() => {
    service.reset();
    service.onModuleDestroy(); // Clear the cleanup interval
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordApiCall', () => {
    it('should record an API call metric', () => {
      const metric: ApiMetric = {
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
        userId: 'user-1',
      };

      service.recordApiCall(metric);

      const metrics = service.getMetrics();
      expect(metrics.apiCalls.total).toBe(1);
      expect(metrics.apiCalls.byEndpoint['/api/items']).toBe(1);
    });

    it('should track active users', () => {
      const metric: ApiMetric = {
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
        userId: 'user-1',
      };

      service.recordApiCall(metric);

      const metrics = service.getMetrics();
      expect(metrics.users.activeUsers).toBe(1);
    });

    it('should handle multiple users', () => {
      const metric1: ApiMetric = {
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
        userId: 'user-1',
      };

      const metric2: ApiMetric = {
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
        userId: 'user-2',
      };

      service.recordApiCall(metric1);
      service.recordApiCall(metric2);

      const metrics = service.getMetrics();
      expect(metrics.users.activeUsers).toBe(2);
    });

    it('should not duplicate active users', () => {
      const metric1: ApiMetric = {
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
        userId: 'user-1',
      };

      const metric2: ApiMetric = {
        endpoint: '/api/trades',
        method: 'POST',
        statusCode: 201,
        responseTime: 200,
        timestamp: new Date(),
        userId: 'user-1',
      };

      service.recordApiCall(metric1);
      service.recordApiCall(metric2);

      const metrics = service.getMetrics();
      expect(metrics.users.activeUsers).toBe(1);
    });

    it('should handle API calls without userId', () => {
      const metric: ApiMetric = {
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 150,
        timestamp: new Date(),
      };

      service.recordApiCall(metric);

      const metrics = service.getMetrics();
      expect(metrics.apiCalls.total).toBe(1);
      expect(metrics.users.activeUsers).toBe(0);
    });

    it('should prevent memory overflow by limiting metrics', () => {
      // Record more than MAX_METRICS (10000)
      for (let i = 0; i < 10005; i++) {
        service.recordApiCall({
          endpoint: '/api/test',
          method: 'GET',
          statusCode: 200,
          responseTime: 100,
          timestamp: new Date(),
        });
      }

      const metrics = service.getMetrics();
      // Should not exceed MAX_METRICS
      expect(metrics.apiCalls.total).toBeLessThanOrEqual(10000);
    });
  });

  describe('recordError', () => {
    it('should record an error metric', () => {
      const errorMetric: ErrorMetric = {
        endpoint: '/api/items',
        method: 'POST',
        error: 'Validation failed',
        stack: 'Error stack...',
        timestamp: new Date(),
        userId: 'user-1',
      };

      service.recordError(errorMetric);

      const errors = service.getErrors(10);
      expect(errors).toHaveLength(1);
      expect(errors[0].error).toBe('Validation failed');
    });

    it('should handle errors without stack trace', () => {
      const errorMetric: ErrorMetric = {
        endpoint: '/api/items',
        method: 'POST',
        error: 'Not found',
        timestamp: new Date(),
      };

      service.recordError(errorMetric);

      const errors = service.getErrors(10);
      expect(errors[0].stack).toBeUndefined();
    });

    it('should prevent memory overflow for error metrics', () => {
      // Record more than MAX_METRICS
      for (let i = 0; i < 10005; i++) {
        service.recordError({
          endpoint: '/api/test',
          method: 'GET',
          error: 'Test error',
          timestamp: new Date(),
        });
      }

      const errors = service.getErrors(15000);
      expect(errors.length).toBeLessThanOrEqual(10000);
    });
  });

  describe('getMetrics', () => {
    it('should return empty metrics when no data recorded', () => {
      const metrics = service.getMetrics();

      expect(metrics.apiCalls.total).toBe(0);
      expect(metrics.errors.total).toBe(0);
      expect(metrics.users.activeUsers).toBe(0);
    });

    it('should calculate API call statistics', () => {
      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      service.recordApiCall({
        endpoint: '/api/items',
        method: 'POST',
        statusCode: 201,
        responseTime: 150,
        timestamp: new Date(),
      });

      service.recordApiCall({
        endpoint: '/api/trades',
        method: 'GET',
        statusCode: 404,
        responseTime: 50,
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      expect(metrics.apiCalls.total).toBe(3);
      expect(metrics.apiCalls.byEndpoint['/api/items']).toBe(2);
      expect(metrics.apiCalls.byEndpoint['/api/trades']).toBe(1);
      expect(metrics.apiCalls.byStatusCode[200]).toBe(1);
      expect(metrics.apiCalls.byStatusCode[201]).toBe(1);
      expect(metrics.apiCalls.byStatusCode[404]).toBe(1);
    });

    it('should calculate performance statistics', () => {
      // Record calls with varying response times
      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 200,
        timestamp: new Date(),
      });

      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 300,
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      expect(metrics.performance.averageResponseTime).toBe(200);
      expect(metrics.performance.p95ResponseTime).toBeGreaterThan(0);
      expect(metrics.performance.p99ResponseTime).toBeGreaterThan(0);
    });

    it('should identify slowest endpoints', () => {
      // Fast endpoint
      service.recordApiCall({
        endpoint: '/api/health',
        method: 'GET',
        statusCode: 200,
        responseTime: 50,
        timestamp: new Date(),
      });

      // Slow endpoint
      service.recordApiCall({
        endpoint: '/api/search',
        method: 'GET',
        statusCode: 200,
        responseTime: 500,
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      expect(metrics.performance.slowestEndpoints.length).toBeGreaterThan(0);
      expect(metrics.performance.slowestEndpoints[0].endpoint).toBe(
        '/api/search',
      );
      expect(metrics.performance.slowestEndpoints[0].avgTime).toBe(500);
    });

    it('should calculate error rate', () => {
      // Record successful calls
      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      // Record error
      service.recordError({
        endpoint: '/api/items',
        method: 'POST',
        error: 'Validation failed',
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      expect(metrics.errors.total).toBe(1);
      expect(metrics.errors.errorRate).toBe(50); // 1 error out of 2 calls = 50%
    });

    it('should handle zero API calls when calculating error rate', () => {
      service.recordError({
        endpoint: '/api/items',
        method: 'POST',
        error: 'Error',
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      expect(metrics.errors.errorRate).toBe(0);
    });

    it('should group errors by endpoint', () => {
      service.recordError({
        endpoint: '/api/items',
        method: 'POST',
        error: 'Error 1',
        timestamp: new Date(),
      });

      service.recordError({
        endpoint: '/api/items',
        method: 'POST',
        error: 'Error 2',
        timestamp: new Date(),
      });

      service.recordError({
        endpoint: '/api/trades',
        method: 'GET',
        error: 'Error 3',
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      expect(metrics.errors.byEndpoint['/api/items']).toBe(2);
      expect(metrics.errors.byEndpoint['/api/trades']).toBe(1);
    });

    it('should include last 10 recent errors', () => {
      // Record 15 errors
      for (let i = 0; i < 15; i++) {
        service.recordError({
          endpoint: '/api/test',
          method: 'GET',
          error: `Error ${i}`,
          timestamp: new Date(),
        });
      }

      const metrics = service.getMetrics();

      expect(metrics.errors.recentErrors).toHaveLength(10);
    });

    it('should track requests by user', () => {
      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
        userId: 'user-1',
      });

      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
        userId: 'user-1',
      });

      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
        userId: 'user-2',
      });

      const metrics = service.getMetrics();

      expect(metrics.users.requestsByUser['user-1']).toBe(2);
      expect(metrics.users.requestsByUser['user-2']).toBe(1);
    });

    it('should only include metrics within retention period', () => {
      // Record old metric (25 hours ago)
      const oldDate = new Date();
      oldDate.setHours(oldDate.getHours() - 25);

      service.recordApiCall({
        endpoint: '/api/old',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: oldDate,
      });

      // Record recent metric
      service.recordApiCall({
        endpoint: '/api/recent',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      // Should only include recent metric
      expect(metrics.apiCalls.total).toBe(1);
      expect(metrics.apiCalls.byEndpoint['/api/recent']).toBe(1);
      expect(metrics.apiCalls.byEndpoint['/api/old']).toBeUndefined();
    });
  });

  describe('getErrors', () => {
    it('should return last N errors', () => {
      for (let i = 0; i < 10; i++) {
        service.recordError({
          endpoint: '/api/test',
          method: 'GET',
          error: `Error ${i}`,
          timestamp: new Date(),
        });
      }

      const errors = service.getErrors(5);

      expect(errors).toHaveLength(5);
      expect(errors[0].error).toBe('Error 5');
      expect(errors[4].error).toBe('Error 9');
    });

    it('should return all errors if limit exceeds total', () => {
      service.recordError({
        endpoint: '/api/test',
        method: 'GET',
        error: 'Error 1',
        timestamp: new Date(),
      });

      const errors = service.getErrors(100);

      expect(errors).toHaveLength(1);
    });

    it('should return empty array when no errors', () => {
      const errors = service.getErrors(10);

      expect(errors).toHaveLength(0);
    });
  });

  describe('getPerformanceStats', () => {
    it('should return performance statistics', () => {
      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 200,
        timestamp: new Date(),
      });

      const stats = service.getPerformanceStats();

      expect(stats).toHaveProperty('averageResponseTime');
      expect(stats).toHaveProperty('p95ResponseTime');
      expect(stats).toHaveProperty('p99ResponseTime');
      expect(stats).toHaveProperty('slowestEndpoints');
    });

    it('should handle empty metrics', () => {
      const stats = service.getPerformanceStats();

      expect(stats.averageResponseTime).toBe(0);
      expect(stats.p95ResponseTime).toBe(0);
      expect(stats.p99ResponseTime).toBe(0);
      expect(stats.slowestEndpoints).toEqual([]);
    });
  });

  describe('reset', () => {
    it('should clear all metrics', () => {
      service.recordApiCall({
        endpoint: '/api/items',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
        userId: 'user-1',
      });

      service.recordError({
        endpoint: '/api/items',
        method: 'POST',
        error: 'Error',
        timestamp: new Date(),
      });

      service.reset();

      const metrics = service.getMetrics();
      expect(metrics.apiCalls.total).toBe(0);
      expect(metrics.errors.total).toBe(0);
      expect(metrics.users.activeUsers).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle percentile calculation with single value', () => {
      service.recordApiCall({
        endpoint: '/api/test',
        method: 'GET',
        statusCode: 200,
        responseTime: 100,
        timestamp: new Date(),
      });

      const metrics = service.getMetrics();

      expect(metrics.performance.p95ResponseTime).toBe(100);
      expect(metrics.performance.p99ResponseTime).toBe(100);
    });

    it('should handle average calculation with empty array', () => {
      const metrics = service.getMetrics();

      expect(metrics.performance.averageResponseTime).toBe(0);
    });

    it('should return top 5 slowest endpoints only', () => {
      // Create 10 endpoints with different response times
      for (let i = 0; i < 10; i++) {
        service.recordApiCall({
          endpoint: `/api/endpoint-${i}`,
          method: 'GET',
          statusCode: 200,
          responseTime: (i + 1) * 100,
          timestamp: new Date(),
        });
      }

      const metrics = service.getMetrics();

      expect(metrics.performance.slowestEndpoints).toHaveLength(5);
      expect(metrics.performance.slowestEndpoints[0].avgTime).toBeGreaterThan(
        metrics.performance.slowestEndpoints[4].avgTime,
      );
    });
  });
});

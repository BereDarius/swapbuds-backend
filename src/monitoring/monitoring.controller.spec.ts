import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { mockMonitoringService } from '@/test/mocks/monitoring.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { MonitoringController } from './monitoring.controller';
import { AggregatedMetrics, MonitoringService } from './monitoring.service';

describe('MonitoringController', () => {
  let controller: MonitoringController;
  let monitoringService: MonitoringService;

  const mockMetrics: AggregatedMetrics = {
    apiCalls: {
      total: 1000,
      byEndpoint: {
        '/api/items': 500,
        '/api/users': 300,
        '/api/trades': 200,
      },
      byStatusCode: {
        200: 900,
        404: 50,
        500: 50,
      },
    },
    performance: {
      averageResponseTime: 125,
      p95ResponseTime: 250,
      p99ResponseTime: 500,
      slowestEndpoints: [
        { endpoint: '/api/trades/search', avgTime: 350 },
        { endpoint: '/api/items/search', avgTime: 280 },
      ],
    },
    errors: {
      total: 50,
      byEndpoint: {
        '/api/trades': 30,
        '/api/items': 20,
      },
      errorRate: 5.0,
      recentErrors: [],
    },
    users: {
      activeUsers: 150,
      requestsByUser: {
        'user-1': 50,
        'user-2': 30,
      },
    },
  };

  const mockErrors = [
    {
      endpoint: '/api/items',
      method: 'POST',
      error: 'Validation failed',
      stack: 'Error stack trace...',
      timestamp: new Date(),
      userId: 'user-1',
    },
    {
      endpoint: '/api/trades',
      method: 'GET',
      error: 'Database connection failed',
      timestamp: new Date(),
    },
  ];

  const mockPerformanceStats = {
    averageResponseTime: 125,
    p95ResponseTime: 250,
    p99ResponseTime: 500,
    slowestEndpoints: [
      { endpoint: '/api/trades/search', avgTime: 350 },
      { endpoint: '/api/items/search', avgTime: 280 },
    ],
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitoringController],
      providers: [
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<MonitoringController>(MonitoringController);
    monitoringService = module.get<MonitoringService>(MonitoringService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return aggregated metrics', () => {
      mockMonitoringService.getMetrics.mockReturnValue(mockMetrics);

      const result = controller.getMetrics();

      expect(result).toEqual(mockMetrics);
      expect(monitoringService.getMetrics).toHaveBeenCalledTimes(1);
    });

    it('should include API call statistics', () => {
      mockMonitoringService.getMetrics.mockReturnValue(mockMetrics);

      const result = controller.getMetrics();

      expect(result.apiCalls).toBeDefined();
      expect(result.apiCalls.total).toBe(1000);
      expect(result.apiCalls.byEndpoint).toBeDefined();
      expect(result.apiCalls.byStatusCode).toBeDefined();
    });

    it('should include performance statistics', () => {
      mockMonitoringService.getMetrics.mockReturnValue(mockMetrics);

      const result = controller.getMetrics();

      expect(result.performance).toBeDefined();
      expect(result.performance.averageResponseTime).toBe(125);
      expect(result.performance.p95ResponseTime).toBe(250);
      expect(result.performance.p99ResponseTime).toBe(500);
      expect(result.performance.slowestEndpoints).toHaveLength(2);
    });

    it('should include error statistics', () => {
      mockMonitoringService.getMetrics.mockReturnValue(mockMetrics);

      const result = controller.getMetrics();

      expect(result.errors).toBeDefined();
      expect(result.errors.total).toBe(50);
      expect(result.errors.errorRate).toBe(5.0);
      expect(result.errors.byEndpoint).toBeDefined();
    });

    it('should include user statistics', () => {
      mockMonitoringService.getMetrics.mockReturnValue(mockMetrics);

      const result = controller.getMetrics();

      expect(result.users).toBeDefined();
      expect(result.users.activeUsers).toBe(150);
      expect(result.users.requestsByUser).toBeDefined();
    });
  });

  describe('getErrors', () => {
    it('should return error logs with default limit', () => {
      mockMonitoringService.getErrors.mockReturnValue(mockErrors);

      const result = controller.getErrors();

      expect(result).toEqual(mockErrors);
      expect(monitoringService.getErrors).toHaveBeenCalledWith(50);
      expect(monitoringService.getErrors).toHaveBeenCalledTimes(1);
    });

    it('should return error logs with custom limit', () => {
      mockMonitoringService.getErrors.mockReturnValue(mockErrors.slice(0, 1));

      const result = controller.getErrors('10');

      expect(result).toHaveLength(1);
      expect(monitoringService.getErrors).toHaveBeenCalledWith(10);
    });

    it('should parse string limit to number', () => {
      mockMonitoringService.getErrors.mockReturnValue(mockErrors);

      controller.getErrors('100');

      expect(monitoringService.getErrors).toHaveBeenCalledWith(100);
    });

    it('should handle invalid limit gracefully', () => {
      mockMonitoringService.getErrors.mockReturnValue(mockErrors);

      controller.getErrors('invalid');

      // Should use NaN which will default to 50
      expect(monitoringService.getErrors).toHaveBeenCalled();
    });

    it('should return errors with all required fields', () => {
      mockMonitoringService.getErrors.mockReturnValue(mockErrors);

      const result = controller.getErrors();

      expect(result[0]).toHaveProperty('endpoint');
      expect(result[0]).toHaveProperty('method');
      expect(result[0]).toHaveProperty('error');
      expect(result[0]).toHaveProperty('timestamp');
    });

    it('should include optional userId when available', () => {
      mockMonitoringService.getErrors.mockReturnValue(mockErrors);

      const result = controller.getErrors();

      expect(result[0].userId).toBe('user-1');
    });

    it('should handle errors without userId', () => {
      mockMonitoringService.getErrors.mockReturnValue(mockErrors);

      const result = controller.getErrors();

      expect(result[1].userId).toBeUndefined();
    });
  });

  describe('getPerformance', () => {
    it('should return performance statistics', () => {
      mockMonitoringService.getPerformanceStats.mockReturnValue(
        mockPerformanceStats,
      );

      const result = controller.getPerformance();

      expect(result).toEqual(mockPerformanceStats);
      expect(monitoringService.getPerformanceStats).toHaveBeenCalledTimes(1);
    });

    it('should include average response time', () => {
      mockMonitoringService.getPerformanceStats.mockReturnValue(
        mockPerformanceStats,
      );

      const result = controller.getPerformance();

      expect(result.averageResponseTime).toBe(125);
    });

    it('should include percentile response times', () => {
      mockMonitoringService.getPerformanceStats.mockReturnValue(
        mockPerformanceStats,
      );

      const result = controller.getPerformance();

      expect(result.p95ResponseTime).toBe(250);
      expect(result.p99ResponseTime).toBe(500);
    });

    it('should include slowest endpoints', () => {
      mockMonitoringService.getPerformanceStats.mockReturnValue(
        mockPerformanceStats,
      );

      const result = controller.getPerformance();

      expect(result.slowestEndpoints).toHaveLength(2);
      expect(result.slowestEndpoints[0]).toEqual({
        endpoint: '/api/trades/search',
        avgTime: 350,
      });
    });
  });
});

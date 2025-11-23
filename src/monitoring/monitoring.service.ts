import { Injectable, Logger } from '@nestjs/common';

/**
 * Metric types that can be tracked
 */
export enum MetricType {
  API_CALL = 'api_call',
  ERROR = 'error',
  USER_ACTION = 'user_action',
}

/**
 * Interface for API metrics
 */
export interface ApiMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  timestamp: Date;
  userId?: string;
}

/**
 * Interface for error metrics
 */
export interface ErrorMetric {
  endpoint: string;
  method: string;
  error: string;
  stack?: string;
  timestamp: Date;
  userId?: string;
}

/**
 * Interface for aggregated metrics
 */
export interface AggregatedMetrics {
  apiCalls: {
    total: number;
    byEndpoint: Record<string, number>;
    byStatusCode: Record<number, number>;
  };
  performance: {
    averageResponseTime: number;
    p95ResponseTime: number;
    p99ResponseTime: number;
    slowestEndpoints: Array<{ endpoint: string; avgTime: number }>;
  };
  errors: {
    total: number;
    byEndpoint: Record<string, number>;
    errorRate: number;
    recentErrors: ErrorMetric[];
  };
  users: {
    activeUsers: number;
    requestsByUser: Record<string, number>;
  };
}

/**
 * MonitoringService - Platform monitoring and metrics tracking
 *
 * Tracks various metrics across the platform:
 * - API call counts and response times
 * - Error rates and details
 * - Active user counts
 * - Performance statistics
 *
 * Metrics are stored in memory with a configurable retention period.
 */
@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  // In-memory storage for metrics
  private apiMetrics: ApiMetric[] = [];
  private errorMetrics: ErrorMetric[] = [];
  private activeUsers: Set<string> = new Set();

  // Configuration
  private readonly MAX_METRICS = 10000; // Maximum metrics to keep in memory
  private readonly RETENTION_HOURS = 24; // Hours to retain metrics

  constructor() {
    // Clean up old metrics every hour
    setInterval(() => this.cleanupOldMetrics(), 60 * 60 * 1000);
  }

  /**
   * Record an API call metric
   */
  recordApiCall(metric: ApiMetric): void {
    this.apiMetrics.push(metric);

    // Track active users
    if (metric.userId) {
      this.activeUsers.add(metric.userId);
    }

    // Prevent memory overflow
    if (this.apiMetrics.length > this.MAX_METRICS) {
      this.apiMetrics.shift();
    }

    this.logger.debug(
      `API call recorded: ${metric.method} ${metric.endpoint} - ${metric.statusCode} (${metric.responseTime}ms)`,
    );
  }

  /**
   * Record an error metric
   */
  recordError(metric: ErrorMetric): void {
    this.errorMetrics.push(metric);

    // Prevent memory overflow
    if (this.errorMetrics.length > this.MAX_METRICS) {
      this.errorMetrics.shift();
    }

    this.logger.error(
      `Error recorded: ${metric.method} ${metric.endpoint} - ${metric.error}`,
    );
  }

  /**
   * Get aggregated metrics
   */
  getMetrics(): AggregatedMetrics {
    const now = Date.now();
    const oneDayAgo = now - this.RETENTION_HOURS * 60 * 60 * 1000;

    // Filter recent metrics
    const recentApiMetrics = this.apiMetrics.filter(
      (m) => m.timestamp.getTime() > oneDayAgo,
    );
    const recentErrorMetrics = this.errorMetrics.filter(
      (m) => m.timestamp.getTime() > oneDayAgo,
    );

    // Calculate API call statistics
    const apiCalls = {
      total: recentApiMetrics.length,
      byEndpoint: this.groupByEndpoint(recentApiMetrics),
      byStatusCode: this.groupByStatusCode(recentApiMetrics),
    };

    // Calculate performance statistics
    const responseTimes = recentApiMetrics.map((m) => m.responseTime);
    const performance = {
      averageResponseTime: this.calculateAverage(responseTimes),
      p95ResponseTime: this.calculatePercentile(responseTimes, 95),
      p99ResponseTime: this.calculatePercentile(responseTimes, 99),
      slowestEndpoints: this.getSlowestEndpoints(recentApiMetrics),
    };

    // Calculate error statistics
    const errors = {
      total: recentErrorMetrics.length,
      byEndpoint: this.groupErrorsByEndpoint(recentErrorMetrics),
      errorRate:
        apiCalls.total > 0
          ? (recentErrorMetrics.length / apiCalls.total) * 100
          : 0,
      recentErrors: recentErrorMetrics.slice(-10), // Last 10 errors
    };

    // User statistics
    const users = {
      activeUsers: this.activeUsers.size,
      requestsByUser: this.groupByUser(recentApiMetrics),
    };

    return {
      apiCalls,
      performance,
      errors,
      users,
    };
  }

  /**
   * Get error logs
   */
  getErrors(limit: number = 50): ErrorMetric[] {
    return this.errorMetrics.slice(-limit);
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats() {
    const metrics = this.getMetrics();
    return metrics.performance;
  }

  /**
   * Reset metrics (useful for testing)
   */
  reset(): void {
    this.apiMetrics = [];
    this.errorMetrics = [];
    this.activeUsers.clear();
    this.logger.log('Metrics reset');
  }

  // Private helper methods

  private groupByEndpoint(metrics: ApiMetric[]): Record<string, number> {
    return metrics.reduce(
      (acc, m) => {
        acc[m.endpoint] = (acc[m.endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupByStatusCode(metrics: ApiMetric[]): Record<number, number> {
    return metrics.reduce(
      (acc, m) => {
        acc[m.statusCode] = (acc[m.statusCode] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );
  }

  private groupErrorsByEndpoint(
    metrics: ErrorMetric[],
  ): Record<string, number> {
    return metrics.reduce(
      (acc, m) => {
        acc[m.endpoint] = (acc[m.endpoint] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
  }

  private groupByUser(metrics: ApiMetric[]): Record<string, number> {
    return metrics
      .filter((m) => m.userId)
      .reduce(
        (acc, m) => {
          acc[m.userId!] = (acc[m.userId!] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      );
  }

  private calculateAverage(values: number[]): number {
    if (values.length === 0) return 0;
    return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index] || 0;
  }

  private getSlowestEndpoints(
    metrics: ApiMetric[],
  ): Array<{ endpoint: string; avgTime: number }> {
    const endpointTimes: Record<string, number[]> = {};

    // Group response times by endpoint
    metrics.forEach((m) => {
      if (!endpointTimes[m.endpoint]) {
        endpointTimes[m.endpoint] = [];
      }
      endpointTimes[m.endpoint].push(m.responseTime);
    });

    // Calculate averages and sort
    return Object.entries(endpointTimes)
      .map(([endpoint, times]) => ({
        endpoint,
        avgTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, 5); // Top 5 slowest
  }

  private cleanupOldMetrics(): void {
    const now = Date.now();
    const cutoff = now - this.RETENTION_HOURS * 60 * 60 * 1000;

    const beforeCount = this.apiMetrics.length + this.errorMetrics.length;

    this.apiMetrics = this.apiMetrics.filter(
      (m) => m.timestamp.getTime() > cutoff,
    );
    this.errorMetrics = this.errorMetrics.filter(
      (m) => m.timestamp.getTime() > cutoff,
    );

    // Clear active users set periodically
    this.activeUsers.clear();

    const afterCount = this.apiMetrics.length + this.errorMetrics.length;
    const removed = beforeCount - afterCount;

    if (removed > 0) {
      this.logger.log(`Cleaned up ${removed} old metrics`);
    }
  }
}

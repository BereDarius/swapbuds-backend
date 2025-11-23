import { Global, Module } from '@nestjs/common';
import { MonitoringController } from './monitoring.controller';
import { MonitoringInterceptor } from './monitoring.interceptor';
import { MonitoringService } from './monitoring.service';

/**
 * MonitoringModule - Platform monitoring and metrics
 *
 * This module is marked as @Global so MonitoringService is available
 * throughout the application.
 *
 * Provides:
 * - MonitoringService: Core metrics tracking
 * - MonitoringInterceptor: Automatic request/response capturing
 * - MonitoringController: Admin endpoints for viewing metrics
 */
@Global()
@Module({
  controllers: [MonitoringController],
  providers: [MonitoringService, MonitoringInterceptor],
  exports: [MonitoringService, MonitoringInterceptor],
})
export class MonitoringModule {}

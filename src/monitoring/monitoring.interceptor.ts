import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { MonitoringService } from './monitoring.service';

/**
 * MonitoringInterceptor - Automatically captures API metrics
 *
 * This interceptor wraps all HTTP requests and records:
 * - Request method and endpoint
 * - Response time
 * - Status code
 * - User ID (if authenticated)
 * - Errors
 *
 * Apply globally in AppModule or per-controller as needed.
 *
 * @example
 * ```typescript
 * // In AppModule
 * providers: [
 *   {
 *     provide: APP_INTERCEPTOR,
 *     useClass: MonitoringInterceptor,
 *   },
 * ]
 * ```
 */
@Injectable()
export class MonitoringInterceptor implements NestInterceptor {
  constructor(private readonly monitoringService: MonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Only monitor HTTP requests
    if (context.getType() !== 'http') {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    const startTime = Date.now();
    const { method, url, user } = request;

    return next.handle().pipe(
      tap(() => {
        // Record successful API call
        const responseTime = Date.now() - startTime;
        this.monitoringService.recordApiCall({
          endpoint: url,
          method,
          statusCode: response.statusCode,
          responseTime,
          timestamp: new Date(),
          userId: user?.id,
        });
      }),
      catchError((error) => {
        // Record error
        const responseTime = Date.now() - startTime;

        this.monitoringService.recordError({
          endpoint: url,
          method,
          error: error.message || 'Unknown error',
          stack: error.stack,
          timestamp: new Date(),
          userId: user?.id,
        });

        // Also record API call with error status
        this.monitoringService.recordApiCall({
          endpoint: url,
          method,
          statusCode: error.status || 500,
          responseTime,
          timestamp: new Date(),
          userId: user?.id,
        });

        return throwError(() => error);
      }),
    );
  }
}

import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of, throwError } from 'rxjs';
import { MonitoringInterceptor } from './monitoring.interceptor';
import { MonitoringService } from './monitoring.service';

describe('MonitoringInterceptor', () => {
  let interceptor: MonitoringInterceptor;
  let monitoringService: MonitoringService;

  const mockMonitoringService = {
    recordApiCall: jest.fn(),
    recordError: jest.fn(),
  };

  const mockExecutionContext = {
    getType: jest.fn(),
    switchToHttp: jest.fn(),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringInterceptor,
        {
          provide: MonitoringService,
          useValue: mockMonitoringService,
        },
      ],
    }).compile();

    interceptor = module.get<MonitoringInterceptor>(MonitoringInterceptor);
    monitoringService = module.get<MonitoringService>(MonitoringService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  describe('intercept - HTTP requests', () => {
    it('should record successful API calls', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/items',
        user: { id: 'user-1' },
      };

      const mockResponse = {
        statusCode: 200,
      };

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: '/api/items',
              method: 'GET',
              statusCode: 200,
              userId: 'user-1',
              timestamp: expect.any(Date),
              responseTime: expect.any(Number),
            }),
          );
          done();
        },
      });
    });

    it('should calculate response time correctly', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/items',
        user: { id: 'user-1' },
      };

      const mockResponse = {
        statusCode: 200,
      };

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      const startTime = Date.now();

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          const endTime = Date.now();
          const callArgs = (monitoringService.recordApiCall as jest.Mock).mock
            .calls[0][0];

          expect(callArgs.responseTime).toBeGreaterThanOrEqual(0);
          expect(callArgs.responseTime).toBeLessThanOrEqual(
            endTime - startTime + 100,
          );
          done();
        },
      });
    });

    it('should handle requests without user', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/public',
      };

      const mockResponse = {
        statusCode: 200,
      };

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: '/api/public',
              method: 'GET',
              statusCode: 200,
              userId: undefined,
            }),
          );
          done();
        },
      });
    });

    it('should record different status codes', (done) => {
      const mockRequest = {
        method: 'POST',
        url: '/api/items',
        user: { id: 'user-1' },
      };

      const mockResponse = {
        statusCode: 201,
      };

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'created' }),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            expect.objectContaining({
              statusCode: 201,
            }),
          );
          done();
        },
      });
    });

    it('should record different HTTP methods', (done) => {
      const methods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
      let completed = 0;

      methods.forEach((method) => {
        const mockRequest = {
          method,
          url: '/api/items',
          user: { id: 'user-1' },
        };

        const mockResponse = {
          statusCode: 200,
        };

        (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
        (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
          getRequest: () => mockRequest,
          getResponse: () => mockResponse,
        });

        (mockCallHandler.handle as jest.Mock).mockReturnValue(
          of({ data: 'test' }),
        );

        interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
          next: () => {
            completed++;
            if (completed === methods.length) {
              expect(monitoringService.recordApiCall).toHaveBeenCalledTimes(
                methods.length,
              );
              done();
            }
          },
        });
      });
    });
  });

  describe('intercept - Error handling', () => {
    it('should record errors and API calls on failure', (done) => {
      const mockRequest = {
        method: 'POST',
        url: '/api/items',
        user: { id: 'user-1' },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockError = {
        message: 'Validation failed',
        stack: 'Error stack trace...',
        status: 400,
      };

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => mockError),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(monitoringService.recordError).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: '/api/items',
              method: 'POST',
              error: 'Validation failed',
              stack: 'Error stack trace...',
              userId: 'user-1',
              timestamp: expect.any(Date),
            }),
          );

          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            expect.objectContaining({
              endpoint: '/api/items',
              method: 'POST',
              statusCode: 400,
              userId: 'user-1',
            }),
          );

          expect(error).toEqual(mockError);
          done();
        },
      });
    });

    it('should handle errors without status code', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/items',
        user: { id: 'user-1' },
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockError = {
        message: 'Unknown error',
      };

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => mockError),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(monitoringService.recordApiCall).toHaveBeenCalledWith(
            expect.objectContaining({
              statusCode: 500, // Default status code
            }),
          );
          done();
        },
      });
    });

    it('should handle errors without message', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/items',
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockError = {};

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => mockError),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(monitoringService.recordError).toHaveBeenCalledWith(
            expect.objectContaining({
              error: 'Unknown error',
            }),
          );
          done();
        },
      });
    });

    it('should handle errors without user', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/items',
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockError = {
        message: 'Error',
        status: 500,
      };

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => mockError),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: () => {
          expect(monitoringService.recordError).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: undefined,
            }),
          );
          done();
        },
      });
    });

    it('should re-throw the error', (done) => {
      const mockRequest = {
        method: 'GET',
        url: '/api/items',
      };

      const mockResponse = {
        statusCode: 200,
      };

      const mockError = new Error('Test error');

      (mockExecutionContext.getType as jest.Mock).mockReturnValue('http');
      (mockExecutionContext.switchToHttp as jest.Mock).mockReturnValue({
        getRequest: () => mockRequest,
        getResponse: () => mockResponse,
      });

      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        throwError(() => mockError),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        error: (error) => {
          expect(error).toBe(mockError);
          done();
        },
      });
    });
  });

  describe('intercept - Non-HTTP requests', () => {
    it('should skip monitoring for WebSocket requests', (done) => {
      (mockExecutionContext.getType as jest.Mock).mockReturnValue('ws');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(monitoringService.recordApiCall).not.toHaveBeenCalled();
          expect(monitoringService.recordError).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should skip monitoring for RPC requests', (done) => {
      (mockExecutionContext.getType as jest.Mock).mockReturnValue('rpc');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: () => {
          expect(monitoringService.recordApiCall).not.toHaveBeenCalled();
          expect(monitoringService.recordError).not.toHaveBeenCalled();
          done();
        },
      });
    });

    it('should pass through non-HTTP requests', (done) => {
      (mockExecutionContext.getType as jest.Mock).mockReturnValue('ws');
      (mockCallHandler.handle as jest.Mock).mockReturnValue(
        of({ data: 'test' }),
      );

      interceptor.intercept(mockExecutionContext, mockCallHandler).subscribe({
        next: (result) => {
          expect(result).toEqual({ data: 'test' });
          done();
        },
      });
    });
  });
});

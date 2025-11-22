import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { of } from 'rxjs';
import { CacheService } from '../cache.service';
import { HttpCacheInterceptor } from './http-cache.interceptor';

describe('HttpCacheInterceptor', () => {
  let interceptor: HttpCacheInterceptor;
  let cacheService: CacheService;

  const mockCacheService = {
    get: jest.fn(),
    set: jest.fn(),
  };

  const mockRequest = {
    method: 'GET',
    url: '/api/items?page=1',
    user: { id: 'user-123' },
    headers: {},
  };

  const mockResponse = {
    statusCode: 200,
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
      getResponse: () => mockResponse,
    }),
  } as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: jest.fn(() => of({ data: 'test-data', items: [] })),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    cacheService = module.get<CacheService>(CacheService);
    interceptor = new HttpCacheInterceptor(cacheService, { ttl: 300 });

    jest.clearAllMocks();
    mockRequest.method = 'GET';
    mockRequest.headers = {};
    mockResponse.statusCode = 200;
  });

  describe('GET requests', () => {
    it('should cache response on first request', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      // Execute the observable
      await result.toPromise();

      expect(cacheService.get).toHaveBeenCalledWith(
        'http-cache:user-123:/api/items?page=1',
      );
      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheService.set).toHaveBeenCalledWith(
        'http-cache:user-123:/api/items?page=1',
        expect.objectContaining({
          data: { data: 'test-data', items: [] },
          etag: expect.any(String),
        }),
        300000, // 300 seconds * 1000
      );
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Cache-Control',
        'public, max-age=300',
      );
    });

    it('should return cached response on subsequent requests', async () => {
      const cachedData = {
        data: { data: 'cached-data' },
        etag: '"abc123"',
      };
      mockCacheService.get.mockResolvedValue(cachedData);

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      const data = await result.toPromise();

      expect(cacheService.get).toHaveBeenCalled();
      expect(mockCallHandler.handle).not.toHaveBeenCalled(); // Should not execute handler
      expect(data).toEqual({ data: 'cached-data' });
      expect(mockResponse.setHeader).toHaveBeenCalledWith('ETag', '"abc123"');
    });

    it('should return 304 Not Modified when client ETag matches', async () => {
      const cachedData = {
        data: { data: 'cached-data' },
        etag: '"abc123"',
      };
      mockCacheService.get.mockResolvedValue(cachedData);
      mockRequest.headers['if-none-match'] = '"abc123"';

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      const data = await result.toPromise();

      expect(mockResponse.status).toHaveBeenCalledWith(304);
      expect(data).toBeNull();
      expect(mockCallHandler.handle).not.toHaveBeenCalled();
    });

    it('should use custom key generator when provided', async () => {
      const customInterceptor = new HttpCacheInterceptor(cacheService, {
        ttl: 60,
        keyGenerator: (req) => `custom:${req.url}`,
      });
      mockCacheService.get.mockResolvedValue(null);

      const result = await customInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await result.toPromise();

      expect(cacheService.get).toHaveBeenCalledWith('custom:/api/items?page=1');
    });

    it('should handle anonymous users', async () => {
      mockRequest.user = undefined;
      mockCacheService.get.mockResolvedValue(null);

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await result.toPromise();

      expect(cacheService.get).toHaveBeenCalledWith(
        'http-cache:anonymous:/api/items?page=1',
      );
    });

    it('should not cache non-200 responses', async () => {
      mockCacheService.get.mockResolvedValue(null);
      mockResponse.statusCode = 404;

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await result.toPromise();

      expect(mockCallHandler.handle).toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
    });

    it('should disable ETag when useETag is false', async () => {
      const noETagInterceptor = new HttpCacheInterceptor(cacheService, {
        ttl: 60,
        useETag: false,
      });
      mockCacheService.get.mockResolvedValue(null);

      const result = await noETagInterceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await result.toPromise();

      const setHeaderCalls = mockResponse.setHeader.mock.calls;
      const etagCall = setHeaderCalls.find((call) => call[0] === 'ETag');
      expect(etagCall).toBeUndefined();
    });
  });

  describe('non-GET requests', () => {
    it('should not cache POST requests', async () => {
      mockRequest.method = 'POST';

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await result.toPromise();

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(cacheService.set).not.toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should not cache PUT requests', async () => {
      mockRequest.method = 'PUT';

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await result.toPromise();

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });

    it('should not cache DELETE requests', async () => {
      mockRequest.method = 'DELETE';

      const result = await interceptor.intercept(
        mockExecutionContext,
        mockCallHandler,
      );

      await result.toPromise();

      expect(cacheService.get).not.toHaveBeenCalled();
      expect(mockCallHandler.handle).toHaveBeenCalled();
    });
  });
});

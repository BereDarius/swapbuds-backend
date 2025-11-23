import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import axios from 'axios';
import { RecaptchaService } from './recaptcha.service';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('RecaptchaService', () => {
  let service: RecaptchaService;

  const mockConfigService = {
    get: jest.fn((key: string, defaultValue?: any) => {
      const config = {
        'recaptcha.secretKey': 'test-secret-key',
        'recaptcha.verifyUrl':
          'https://www.google.com/recaptcha/api/siteverify',
        'recaptcha.minScore': 0.5,
      };
      return config[key] ?? defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecaptchaService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RecaptchaService>(RecaptchaService);

    jest.clearAllMocks();
  });

  describe('verifyToken', () => {
    const mockToken = 'test-recaptcha-token';
    const mockAction = 'register';
    const mockIp = '192.168.1.1';

    it('should successfully verify a valid token with high score', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.9,
          action: mockAction,
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.verifyToken(mockToken, mockAction, mockIp);

      expect(result).toEqual({
        success: true,
        score: 0.9,
        action: mockAction,
      });

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: 'test-secret-key',
            response: mockToken,
            remoteip: mockIp,
          },
        },
      );
    });

    it('should fail verification with low score', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.3,
          action: mockAction,
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.verifyToken(mockToken, mockAction);

      expect(result).toEqual({
        success: false,
        score: 0.3,
        action: mockAction,
        reason: 'Score 0.3 below threshold 0.5',
      });
    });

    it('should fail verification when action mismatch', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.9,
          action: 'login',
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.verifyToken(mockToken, mockAction);

      expect(result).toEqual({
        success: false,
        score: 0.9,
        action: 'login',
        reason: 'Action mismatch. Expected: register, Got: login',
      });
    });

    it('should fail verification when Google API returns error', async () => {
      const mockResponse = {
        data: {
          success: false,
          score: 0,
          action: mockAction,
          'error-codes': ['invalid-input-response', 'timeout-or-duplicate'],
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.verifyToken(mockToken, mockAction);

      expect(result).toEqual({
        success: false,
        score: 0,
        action: mockAction,
        reason:
          'Verification failed: invalid-input-response, timeout-or-duplicate',
      });
    });

    it('should handle network errors gracefully and allow action', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Network error'));

      const result = await service.verifyToken(mockToken, mockAction);

      expect(result).toEqual({
        success: true,
        score: 0.5,
        action: mockAction,
        reason: 'Verification error, allowed by default',
      });
    });

    it('should allow action when no token is provided', async () => {
      const result = await service.verifyToken('', mockAction);

      expect(result).toEqual({
        success: true,
        score: 0.5,
        action: mockAction,
        reason: 'No token provided',
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should allow action when no token is null', async () => {
      const result = await service.verifyToken(null as any, mockAction);

      expect(result).toEqual({
        success: true,
        score: 0.5,
        action: mockAction,
        reason: 'No token provided',
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should verify without IP address', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.8,
          action: mockAction,
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.verifyToken(mockToken, mockAction);

      expect(result.success).toBe(true);
      expect(result.score).toBe(0.8);

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://www.google.com/recaptcha/api/siteverify',
        null,
        {
          params: {
            secret: 'test-secret-key',
            response: mockToken,
            remoteip: undefined,
          },
        },
      );
    });
  });

  describe('verifyToken - without secret key', () => {
    let serviceWithoutKey: RecaptchaService;

    beforeEach(async () => {
      const mockConfigServiceNoKey = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
            'recaptcha.secretKey': '',
            'recaptcha.verifyUrl':
              'https://www.google.com/recaptcha/api/siteverify',
            'recaptcha.minScore': 0.5,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RecaptchaService,
          {
            provide: ConfigService,
            useValue: mockConfigServiceNoKey,
          },
        ],
      }).compile();

      serviceWithoutKey = module.get<RecaptchaService>(RecaptchaService);
    });

    it('should skip verification and allow action when secret key not configured', async () => {
      const result = await serviceWithoutKey.verifyToken(
        'test-token',
        'register',
      );

      expect(result).toEqual({
        success: true,
        score: 1.0,
        action: 'register',
        reason: 'reCAPTCHA not configured',
      });

      expect(mockedAxios.post).not.toHaveBeenCalled();
    });
  });

  describe('verifyTokenWithThreshold', () => {
    const mockToken = 'test-recaptcha-token';
    const mockAction = 'sensitive-action';

    it('should use custom threshold for verification', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.6,
          action: mockAction,
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      // Score 0.6 should pass with threshold 0.5 but fail with 0.7
      const resultPass = await service.verifyTokenWithThreshold(
        mockToken,
        mockAction,
        0.5,
      );
      expect(resultPass.success).toBe(true);

      mockedAxios.post.mockResolvedValue(mockResponse);

      const resultFail = await service.verifyTokenWithThreshold(
        mockToken,
        mockAction,
        0.7,
      );
      expect(resultFail.success).toBe(false);
      expect(resultFail.reason).toContain('below threshold 0.7');
    });

    it('should restore original min score after verification', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.9,
          action: mockAction,
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      await service.verifyTokenWithThreshold(mockToken, mockAction, 0.8);

      // Verify with default threshold again
      mockedAxios.post.mockResolvedValue({
        data: {
          success: true,
          score: 0.4,
          action: 'register',
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      });

      const result = await service.verifyToken('another-token', 'register');

      // Should use original threshold of 0.5, so 0.4 should fail
      expect(result.success).toBe(false);
      expect(result.reason).toContain('below threshold 0.5');
    });
  });

  describe('edge cases', () => {
    it('should handle malformed response from Google API', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          // Missing required fields
        },
      });

      const result = await service.verifyToken('test-token', 'register');

      // Should handle gracefully
      expect(result.success).toBe(false);
    });

    it('should handle timeout errors', async () => {
      const timeoutError = new Error('timeout of 5000ms exceeded');
      timeoutError.name = 'ECONNABORTED';
      mockedAxios.post.mockRejectedValue(timeoutError);

      const result = await service.verifyToken('test-token', 'register');

      expect(result).toEqual({
        success: true,
        score: 0.5,
        action: 'register',
        reason: 'Verification error, allowed by default',
      });
    });

    it('should handle score at exact threshold (boundary test)', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.5, // Exactly at threshold
          action: 'register',
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.verifyToken('test-token', 'register');

      expect(result.success).toBe(true);
      expect(result.score).toBe(0.5);
    });

    it('should handle score just below threshold (boundary test)', async () => {
      const mockResponse = {
        data: {
          success: true,
          score: 0.49,
          action: 'register',
          challenge_ts: '2025-11-23T12:00:00Z',
          hostname: 'localhost',
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await service.verifyToken('test-token', 'register');

      expect(result.success).toBe(false);
      expect(result.reason).toContain('below threshold 0.5');
    });
  });
});

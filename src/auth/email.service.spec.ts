import { mockConfigService, resetConfigMocks } from '@/test/mocks/config.mock';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    // Set NODE_ENV to test BEFORE creating the module to prevent actual email sending
    process.env.NODE_ENV = 'test';

    // Reset and configure mocks
    resetConfigMocks();
    mockConfigService.get.mockImplementation((key: string) => {
      const config: Record<string, string> = {
        MAIL_HOST: '',
        MAIL_PORT: '',
        MAIL_USER: '',
        MAIL_PASSWORD: '',
        MAIL_FROM: 'noreply@swapbuds.com',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key];
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('constructor', () => {
    it('should initialize with email disabled when config is missing', () => {
      expect(service).toBeDefined();
      expect(service['isEmailEnabled']).toBe(false);
    });

    it('should initialize with email enabled when config is complete', async () => {
      const mockConfigWithEmail = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            MAIL_HOST: 'smtp.gmail.com',
            MAIL_PORT: 587,
            MAIL_USER: 'test@swapbuds.com',
            MAIL_PASSWORD: 'test-password',
            MAIL_FROM: 'noreply@swapbuds.com',
            FRONTEND_URL: 'http://localhost:3000',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigWithEmail,
          },
        ],
      }).compile();

      const serviceWithEmail = module.get<EmailService>(EmailService);
      expect(serviceWithEmail['isEmailEnabled']).toBe(true);
      expect(serviceWithEmail['transporter']).toBeDefined();
    });
  });

  describe('sendVerificationEmail', () => {
    it('should log verification email when email is not configured', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendVerificationEmail(
        'test@example.com',
        'testuser',
        'test-token-123',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        '[DEV MODE] Verification email would be sent to test@example.com',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        '[DEV MODE] Verification URL: http://localhost:3000/verify-email?token=test-token-123',
      );

      loggerSpy.mockRestore();
    });

    it('should include correct verification URL', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendVerificationEmail(
        'user@test.com',
        'testuser',
        'abc123',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        '[DEV MODE] Verification URL: http://localhost:3000/verify-email?token=abc123',
      );

      loggerSpy.mockRestore();
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should log password reset email when email is not configured', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendPasswordResetEmail(
        'test@example.com',
        'testuser',
        'reset-token-456',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        '[DEV MODE] Password reset email would be sent to test@example.com',
      );
      expect(loggerSpy).toHaveBeenCalledWith(
        '[DEV MODE] Reset URL: http://localhost:3000/reset-password?token=reset-token-456',
      );

      loggerSpy.mockRestore();
    });

    it('should include correct reset URL', async () => {
      const loggerSpy = jest.spyOn(service['logger'], 'warn');

      await service.sendPasswordResetEmail(
        'user@test.com',
        'testuser',
        'xyz789',
      );

      expect(loggerSpy).toHaveBeenCalledWith(
        '[DEV MODE] Reset URL: http://localhost:3000/reset-password?token=xyz789',
      );

      loggerSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle sendVerificationEmail errors when email is enabled', async () => {
      const mockConfigWithEmail = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            MAIL_HOST: 'smtp.gmail.com',
            MAIL_PORT: 587,
            MAIL_USER: 'test@swapbuds.com',
            MAIL_PASSWORD: 'test-password',
            MAIL_FROM: 'noreply@swapbuds.com',
            FRONTEND_URL: 'http://localhost:3000',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigWithEmail,
          },
        ],
      }).compile();

      const serviceWithEmail = module.get<EmailService>(EmailService);

      // Mock sendMail to throw an error
      serviceWithEmail['transporter'].sendMail = jest
        .fn()
        .mockRejectedValue(new Error('SMTP connection failed'));

      await expect(
        serviceWithEmail.sendVerificationEmail(
          'test@example.com',
          'testuser',
          'token123',
        ),
      ).rejects.toThrow('SMTP connection failed');
    });

    it('should handle sendPasswordResetEmail errors when email is enabled', async () => {
      const mockConfigWithEmail = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            MAIL_HOST: 'smtp.gmail.com',
            MAIL_PORT: 587,
            MAIL_USER: 'test@swapbuds.com',
            MAIL_PASSWORD: 'test-password',
            MAIL_FROM: 'noreply@swapbuds.com',
            FRONTEND_URL: 'http://localhost:3000',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigWithEmail,
          },
        ],
      }).compile();

      const serviceWithEmail = module.get<EmailService>(EmailService);

      // Mock sendMail to throw an error
      serviceWithEmail['transporter'].sendMail = jest
        .fn()
        .mockRejectedValue(new Error('Network timeout'));

      await expect(
        serviceWithEmail.sendPasswordResetEmail(
          'test@example.com',
          'testuser',
          'reset-token',
        ),
      ).rejects.toThrow('Network timeout');
    });
  });

  describe('email sending when configured', () => {
    it('should send actual verification email when email is configured', async () => {
      const mockConfigWithEmail = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            MAIL_HOST: 'smtp.gmail.com',
            MAIL_PORT: 587,
            MAIL_USER: 'test@swapbuds.com',
            MAIL_PASSWORD: 'test-password',
            MAIL_FROM: 'noreply@swapbuds.com',
            FRONTEND_URL: 'http://localhost:3000',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigWithEmail,
          },
        ],
      }).compile();

      const serviceWithEmail = module.get<EmailService>(EmailService);

      // Mock sendMail to succeed
      const sendMailMock = jest.fn().mockResolvedValue({ messageId: '123' });
      serviceWithEmail['transporter'].sendMail = sendMailMock;

      await serviceWithEmail.sendVerificationEmail(
        'test@example.com',
        'testuser',
        'token123',
      );

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Verify Your SwapBuds Email Address',
        }),
      );
    });

    it('should send actual password reset email when email is configured', async () => {
      const mockConfigWithEmail = {
        get: jest.fn((key: string) => {
          const config: Record<string, any> = {
            MAIL_HOST: 'smtp.gmail.com',
            MAIL_PORT: 587,
            MAIL_USER: 'test@swapbuds.com',
            MAIL_PASSWORD: 'test-password',
            MAIL_FROM: 'noreply@swapbuds.com',
            FRONTEND_URL: 'http://localhost:3000',
          };
          return config[key];
        }),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigWithEmail,
          },
        ],
      }).compile();

      const serviceWithEmail = module.get<EmailService>(EmailService);

      // Mock sendMail to succeed
      const sendMailMock = jest.fn().mockResolvedValue({ messageId: '456' });
      serviceWithEmail['transporter'].sendMail = sendMailMock;

      await serviceWithEmail.sendPasswordResetEmail(
        'test@example.com',
        'testuser',
        'reset-token',
      );

      expect(sendMailMock).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'test@example.com',
          subject: 'Reset Your SwapBuds Password',
        }),
      );
    });
  });
});

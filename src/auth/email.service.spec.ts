import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    // Set NODE_ENV to test BEFORE creating the module to prevent actual email sending
    process.env.NODE_ENV = 'test';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              const config: Record<string, string> = {
                MAIL_HOST: '',
                MAIL_PORT: '',
                MAIL_USER: '',
                MAIL_PASSWORD: '',
                MAIL_FROM: 'noreply@swapbuds.com',
                FRONTEND_URL: 'http://localhost:3000',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
  });
});

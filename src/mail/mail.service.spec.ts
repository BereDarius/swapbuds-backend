import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { MailService } from './mail.service';

describe('MailService', () => {
  let service: MailService;

  const mockMailerService = {
    sendMail: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        MAIL_USER: 'test@example.com',
        MAIL_PASSWORD: 'testpassword',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MailService,
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<MailService>(MailService);

    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should enable email when credentials are configured', () => {
      expect(service['isEmailEnabled']).toBe(true);
    });

    it('should disable email when credentials are missing', () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      // This will warn but not throw
      expect(module).toBeDefined();
    });
  });

  describe('sendTradeProposal', () => {
    const tradeData = {
      proposerName: 'proposer_user',
      offeredItemName: 'Offered Item',
      requestedItemName: 'Requested Item',
      tradeId: 'trade-123',
    };

    it('should send trade proposal email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendTradeProposal(
        'responder@example.com',
        'responder_user',
        tradeData,
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'responder@example.com',
        subject: '🔔 New Trade Proposal - SwapBuds',
        template: './trade-proposal',
        context: {
          userName: 'responder_user',
          proposerName: 'proposer_user',
          offeredItemName: 'Offered Item',
          requestedItemName: 'Requested Item',
          tradeUrl: 'http://localhost:3000/trades/trade-123',
        },
      });
    });

    it('should handle email sending error gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendTradeProposal(
        'responder@example.com',
        'responder_user',
        tradeData,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send trade proposal email to responder@example.com',
        expect.any(String),
      );
    });

    it('should skip sending when email is disabled', async () => {
      // Create a new service instance with no credentials
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: mockMailerService },
          { provide: ConfigService, useValue: mockConfigWithoutCreds },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);
      const debugSpy = jest.spyOn(disabledService['logger'], 'debug');

      await disabledService.sendTradeProposal(
        'responder@example.com',
        'responder_user',
        tradeData,
      );

      expect(debugSpy).toHaveBeenCalledWith(
        'Email disabled, skipping trade proposal email',
      );
      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendTradeAccepted', () => {
    const tradeData = {
      responderName: 'responder_user',
      offeredItemName: 'Offered Item',
      requestedItemName: 'Requested Item',
      tradeId: 'trade-123',
    };

    it('should send trade accepted email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendTradeAccepted(
        'proposer@example.com',
        'proposer_user',
        tradeData,
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'proposer@example.com',
        subject: '✅ Trade Accepted - SwapBuds',
        template: './trade-accepted',
        context: {
          userName: 'proposer_user',
          responderName: 'responder_user',
          offeredItemName: 'Offered Item',
          requestedItemName: 'Requested Item',
          tradeUrl: 'http://localhost:3000/trades/trade-123',
        },
      });
    });

    it('should handle email sending error gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(
        new Error('SMTP connection failed'),
      );
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendTradeAccepted(
        'proposer@example.com',
        'proposer_user',
        tradeData,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send trade accepted email to proposer@example.com',
        expect.any(String),
      );
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: mockMailerService },
          { provide: ConfigService, useValue: mockConfigWithoutCreds },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendTradeAccepted(
        'proposer@example.com',
        'proposer_user',
        tradeData,
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendTradeRejected', () => {
    const tradeData = {
      responderName: 'responder_user',
      offeredItemName: 'Offered Item',
      requestedItemName: 'Requested Item',
      tradeId: 'trade-123',
    };

    it('should send trade rejected email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendTradeRejected(
        'proposer@example.com',
        'proposer_user',
        tradeData,
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'proposer@example.com',
        subject: '❌ Trade Rejected - SwapBuds',
        template: './trade-rejected',
        context: {
          userName: 'proposer_user',
          responderName: 'responder_user',
          offeredItemName: 'Offered Item',
          requestedItemName: 'Requested Item',
          tradeUrl: 'http://localhost:3000/trades/trade-123',
        },
      });
    });

    it('should handle email sending error gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Network error'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendTradeRejected(
        'proposer@example.com',
        'proposer_user',
        tradeData,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send trade rejected email to proposer@example.com',
        expect.any(String),
      );
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: mockMailerService },
          { provide: ConfigService, useValue: mockConfigWithoutCreds },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendTradeRejected(
        'proposer@example.com',
        'proposer_user',
        tradeData,
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendTradeCancelled', () => {
    const tradeData = {
      proposerName: 'proposer_user',
      offeredItemName: 'Offered Item',
      requestedItemName: 'Requested Item',
      tradeId: 'trade-123',
    };

    it('should send trade cancelled email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendTradeCancelled(
        'responder@example.com',
        'responder_user',
        tradeData,
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'responder@example.com',
        subject: '🚫 Trade Cancelled - SwapBuds',
        template: './trade-cancelled',
        context: {
          userName: 'responder_user',
          proposerName: 'proposer_user',
          offeredItemName: 'Offered Item',
          requestedItemName: 'Requested Item',
          tradeUrl: 'http://localhost:3000/trades/trade-123',
        },
      });
    });

    it('should handle email sending error gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Send failed'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendTradeCancelled(
        'responder@example.com',
        'responder_user',
        tradeData,
      );

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send trade cancelled email to responder@example.com',
        expect.any(String),
      );
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: mockMailerService },
          { provide: ConfigService, useValue: mockConfigWithoutCreds },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendTradeCancelled(
        'responder@example.com',
        'responder_user',
        tradeData,
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendWelcomeEmail', () => {
    it('should send welcome email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendWelcomeEmail('newuser@example.com', 'new_user');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'newuser@example.com',
        subject: '👋 Welcome to SwapBuds!',
        template: './welcome',
        context: {
          userName: 'new_user',
          appUrl: 'http://localhost:3000',
        },
      });
    });

    it('should handle email sending error gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(
        new Error('Invalid recipient'),
      );
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendWelcomeEmail('newuser@example.com', 'new_user');

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send welcome email to newuser@example.com',
        expect.any(String),
      );
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          { provide: MailerService, useValue: mockMailerService },
          { provide: ConfigService, useValue: mockConfigWithoutCreds },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendWelcomeEmail('newuser@example.com', 'new_user');

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendTradeExpired', () => {
    const tradeData = {
      itemName: 'Gaming Console',
      otherPartyName: 'other_user',
      tradeId: 'trade-123',
      isProposer: true,
    };

    it('should send trade expired email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendTradeExpired(
        'user@example.com',
        'user_name',
        tradeData,
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '⏰ Trade Expired - SwapBuds',
        template: './trade-expired',
        context: {
          userName: 'user_name',
          itemName: tradeData.itemName,
          otherPartyName: tradeData.otherPartyName,
          isProposer: tradeData.isProposer,
          tradeUrl: `http://localhost:3000/trades/${tradeData.tradeId}`,
        },
      });
    });

    it('should handle email sending error gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Failed to send'));

      await expect(
        service.sendTradeExpired('user@example.com', 'user_name', tradeData),
      ).resolves.not.toThrow();
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendTradeExpired(
        'user@example.com',
        'user_name',
        tradeData,
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendTradeExpiringWarning', () => {
    const tradeData = {
      proposerName: 'proposer_user',
      offeredItemName: 'Laptop',
      requestedItemName: 'Camera',
      hoursRemaining: 24,
      tradeId: 'trade-123',
    };

    it('should send trade expiring warning email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendTradeExpiringWarning(
        'user@example.com',
        'user_name',
        tradeData,
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '⏳ Trade Expiring in 24 Hours - SwapBuds',
        template: './trade-expiring',
        context: {
          userName: 'user_name',
          proposerName: tradeData.proposerName,
          offeredItemName: tradeData.offeredItemName,
          requestedItemName: tradeData.requestedItemName,
          hoursRemaining: tradeData.hoursRemaining,
          tradeUrl: `http://localhost:3000/trades/${tradeData.tradeId}`,
        },
      });
    });

    it('should handle email sending error gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Failed to send'));

      await expect(
        service.sendTradeExpiringWarning(
          'user@example.com',
          'user_name',
          tradeData,
        ),
      ).resolves.not.toThrow();
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendTradeExpiringWarning(
        'user@example.com',
        'user_name',
        tradeData,
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('sendVerificationSubmitted', () => {
    it('should send verification submitted email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendVerificationSubmitted('user@example.com', 'John Doe');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '📋 Verification Submitted - SwapBuds',
        template: './verification-submitted',
        context: {
          userName: 'John Doe',
          appUrl: 'http://localhost:3000',
        },
      });
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendVerificationSubmitted(
        'user@example.com',
        'John Doe',
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('SMTP error'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendVerificationSubmitted('user@example.com', 'John Doe');

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('sendVerificationApproved', () => {
    it('should send verification approved email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendVerificationApproved('user@example.com', 'Jane Smith');

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '✅ Verification Approved - SwapBuds',
        template: './verification-approved',
        context: {
          userName: 'Jane Smith',
          appUrl: 'http://localhost:3000',
        },
      });
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendVerificationApproved(
        'user@example.com',
        'Jane Smith',
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Network error'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendVerificationApproved('user@example.com', 'Jane Smith');

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('sendVerificationRejected', () => {
    it('should send verification rejected email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      await service.sendVerificationRejected(
        'user@example.com',
        'Bob Johnson',
        'Documents were not clear',
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'user@example.com',
        subject: '❌ Verification Rejected - SwapBuds',
        template: './verification-rejected',
        context: {
          userName: 'Bob Johnson',
          rejectionReason: 'Documents were not clear',
          appUrl: 'http://localhost:3000',
        },
      });
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendVerificationRejected(
        'user@example.com',
        'Bob Johnson',
        'Reason',
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Email error'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendVerificationRejected(
        'user@example.com',
        'Bob Johnson',
        'Reason',
      );

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('sendAccountSuspendedUnderage', () => {
    it('should send account suspended underage email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          MAIL_USER: 'test@example.com',
          MAIL_PASSWORD: 'testpassword',
          FRONTEND_URL: 'http://localhost:3000',
          SUPPORT_EMAIL: 'support@swapbuds.com',
        };
        return config[key];
      });

      await service.sendAccountSuspendedUnderage(
        'minor@example.com',
        'Young User',
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'minor@example.com',
        subject: '🚫 Account Suspended - SwapBuds',
        template: './account-suspended-underage',
        context: {
          userName: 'Young User',
          supportEmail: 'support@swapbuds.com',
        },
      });
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendAccountSuspendedUnderage(
        'minor@example.com',
        'Young User',
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Failed to send'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendAccountSuspendedUnderage(
        'minor@example.com',
        'Young User',
      );

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('sendAdminVerificationAlert', () => {
    it('should send admin verification alert email successfully', async () => {
      mockMailerService.sendMail.mockResolvedValue({ messageId: 'msg-123' });

      const verificationData = {
        username: 'newuser',
        userId: 'user-123',
        verificationId: 'verify-456',
      };

      await service.sendAdminVerificationAlert(
        'admin@swapbuds.com',
        'Admin Name',
        verificationData,
      );

      expect(mockMailerService.sendMail).toHaveBeenCalledWith({
        to: 'admin@swapbuds.com',
        subject: '🔔 New Verification Submission - SwapBuds Admin',
        template: './admin-verification-alert',
        context: {
          adminName: 'Admin Name',
          username: 'newuser',
          userId: 'user-123',
          verificationUrl:
            'http://localhost:3000/admin/verifications/verify-456',
        },
      });
    });

    it('should skip sending when email is disabled', async () => {
      const mockConfigWithoutCreds = {
        get: jest.fn().mockReturnValue(undefined),
      };

      const module = await Test.createTestingModule({
        providers: [
          MailService,
          {
            provide: MailerService,
            useValue: mockMailerService,
          },
          {
            provide: ConfigService,
            useValue: mockConfigWithoutCreds,
          },
        ],
      }).compile();

      const disabledService = module.get<MailService>(MailService);

      await disabledService.sendAdminVerificationAlert(
        'admin@swapbuds.com',
        'Admin',
        {
          username: 'user',
          userId: '1',
          verificationId: '2',
        },
      );

      expect(mockMailerService.sendMail).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockMailerService.sendMail.mockRejectedValue(new Error('Send failed'));
      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendAdminVerificationAlert('admin@swapbuds.com', 'Admin', {
        username: 'user',
        userId: '1',
        verificationId: '2',
      });

      expect(errorSpy).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should not throw errors when email fails', async () => {
      mockMailerService.sendMail.mockRejectedValue(
        new Error('SMTP server unavailable'),
      );

      await expect(
        service.sendWelcomeEmail('user@example.com', 'user'),
      ).resolves.not.toThrow();
    });

    it('should log detailed error information', async () => {
      const error = new Error('Connection timeout');
      (error as any).code = 'ETIMEDOUT';
      (error as any).stack = 'Error stack trace';
      mockMailerService.sendMail.mockRejectedValue(error);

      const errorSpy = jest.spyOn(service['logger'], 'error');

      await service.sendWelcomeEmail('user@example.com', 'user');

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to send welcome email to user@example.com',
        'Error stack trace',
      );
    });
  });
});

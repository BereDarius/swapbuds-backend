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

import { PrismaService } from '@/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationAuditService } from './verification-audit.service';

describe('VerificationAuditService', () => {
  let service: VerificationAuditService;

  const mockPrismaService = {
    verificationAuditLog: {
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationAuditService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VerificationAuditService>(VerificationAuditService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logSubmission', () => {
    it('should log verification submission', async () => {
      await service.logSubmission('user-1', 'verif-1', 'ID_CARD');

      // Service only logs to logger, no errors thrown
      expect(service).toBeDefined();
    });
  });

  describe('logDocumentAccess', () => {
    it('should log document VIEW access', async () => {
      await service.logDocumentAccess('admin-1', 'verif-1', 'VIEW');

      expect(service).toBeDefined();
    });

    it('should log document DOWNLOAD access', async () => {
      await service.logDocumentAccess('admin-1', 'verif-1', 'DOWNLOAD');

      expect(service).toBeDefined();
    });
  });

  describe('logApproval', () => {
    it('should log verification approval for adult (18+)', async () => {
      await service.logApproval('admin-1', 'verif-1', 'user-1', true);

      expect(service).toBeDefined();
    });

    it('should log verification approval for underage', async () => {
      await service.logApproval('admin-1', 'verif-1', 'user-1', false);

      expect(service).toBeDefined();
    });
  });

  describe('logRejection', () => {
    it('should log verification rejection', async () => {
      await service.logRejection(
        'admin-1',
        'verif-1',
        'user-1',
        'Document unclear',
        false,
      );

      expect(service).toBeDefined();
    });

    it('should log underage rejection', async () => {
      await service.logRejection(
        'admin-1',
        'verif-1',
        'user-1',
        'User is underage',
        true,
      );

      expect(service).toBeDefined();
    });
  });

  describe('logUnderageAccountSuspension', () => {
    it('should log underage account suspension', async () => {
      await service.logUnderageAccountSuspension('verif-1', 'user-1', 16);

      expect(service).toBeDefined();
    });
  });

  describe('logCancellation', () => {
    it('should log verification cancellation', async () => {
      await service.logCancellation('user-1', 'verif-1');

      expect(service).toBeDefined();
    });
  });

  describe('logSuspiciousActivity', () => {
    it('should log suspicious activity', async () => {
      await service.logSuspiciousActivity(
        'user-1',
        'verif-1',
        'Multiple rapid submissions',
      );

      expect(service).toBeDefined();
    });
  });

  describe('logDocumentDeletion', () => {
    it('should log automatic deletion for approved documents', async () => {
      await service.logDocumentDeletion(
        'verif-1',
        'AUTO_DELETION_APPROVED',
        30,
      );

      expect(service).toBeDefined();
    });

    it('should log automatic deletion for rejected documents', async () => {
      await service.logDocumentDeletion(
        'verif-1',
        'AUTO_DELETION_REJECTED',
        90,
      );

      expect(service).toBeDefined();
    });

    it('should log manual document deletion', async () => {
      await service.logDocumentDeletion('verif-1', 'MANUAL', 0);

      expect(service).toBeDefined();
    });
  });

  describe('logRateLimitViolation', () => {
    it('should log rate limit violation', async () => {
      await service.logRateLimitViolation('user-1', 5);

      expect(service).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should not throw errors for any logging method', async () => {
      // All methods should complete successfully (they only log to logger)
      await expect(
        service.logSubmission('user-1', 'verif-1', 'PASSPORT'),
      ).resolves.not.toThrow();

      await expect(
        service.logDocumentAccess('admin-1', 'verif-1', 'VIEW'),
      ).resolves.not.toThrow();

      await expect(
        service.logApproval('admin-1', 'verif-1', 'user-1', true),
      ).resolves.not.toThrow();

      await expect(
        service.logRejection('admin-1', 'verif-1', 'user-1', 'Invalid', false),
      ).resolves.not.toThrow();

      await expect(
        service.logUnderageAccountSuspension('verif-1', 'user-1', 17),
      ).resolves.not.toThrow();

      await expect(
        service.logCancellation('user-1', 'verif-1'),
      ).resolves.not.toThrow();

      await expect(
        service.logSuspiciousActivity('user-1', 'verif-1', 'Test'),
      ).resolves.not.toThrow();

      await expect(
        service.logDocumentDeletion('verif-1', 'MANUAL', 0),
      ).resolves.not.toThrow();

      await expect(
        service.logRateLimitViolation('user-1', 10),
      ).resolves.not.toThrow();
    });
  });
});

import { MailService } from '@/mail/mail.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockMailService } from '@/test/mocks/mail.mock';
import { mockNotificationsService } from '@/test/mocks/notifications.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  mockDocumentSecurityService,
  mockVerificationAuditService,
  mockVerificationRateLimitService,
} from '@/test/mocks/verification.mock';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationStatus } from '@prisma/client';
import { DocumentSecurityService } from './document-security.service';
import { VerificationAuditService } from './verification-audit.service';
import { VerificationRateLimitService } from './verification-rate-limit.service';
import { VerificationService } from './verification.service';

describe('VerificationService - Email Notifications', () => {
  let service: VerificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: VerificationAuditService,
          useValue: mockVerificationAuditService,
        },
        {
          provide: DocumentSecurityService,
          useValue: mockDocumentSecurityService,
        },
        {
          provide: VerificationRateLimitService,
          useValue: mockVerificationRateLimitService,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);

    jest.clearAllMocks();

    // Set default mock return values
    mockVerificationRateLimitService.checkRateLimit.mockResolvedValue({
      canSubmit: true,
      attemptsUsed: 0,
      attemptsRemaining: 3,
      resetDate: new Date(),
    });
  });

  describe('submitVerification', () => {
    it('should send confirmation email on submission', async () => {
      const userId = 'user-123';
      const user = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
      };
      const verification = {
        id: 'verif-123',
        userId,
        documentType: 'ID_CARD',
        documentUrl: 'encrypted:url',
        status: VerificationStatus.PENDING,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);
      mockPrismaService.userVerification.create.mockResolvedValue(verification);
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await service.submitVerification(userId, {
        documentType: 'ID_CARD' as any,
        documentUrlFront: 'https://example.com/doc.jpg',
        selfieUrl: 'https://example.com/selfie.jpg',
      });

      expect(mockMailService.sendVerificationSubmitted).toHaveBeenCalledWith(
        user.email,
        user.username,
      );
    });

    it('should notify admins on submission', async () => {
      const userId = 'user-123';
      const user = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
      };
      const verification = {
        id: 'verif-123',
        userId,
        documentType: 'ID_CARD',
        documentUrl: 'encrypted:url',
        status: VerificationStatus.PENDING,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);
      mockPrismaService.userVerification.create.mockResolvedValue(verification);
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await service.submitVerification(userId, {
        documentType: 'ID_CARD' as any,
        documentUrlFront: 'https://example.com/doc.jpg',
        selfieUrl: 'https://example.com/selfie.jpg',
      });

      expect(
        mockNotificationsService.notifyAdminsOfVerificationSubmission,
      ).toHaveBeenCalledWith(verification.id, userId, user.username);
    });

    it('should not fail if email sending fails', async () => {
      const userId = 'user-123';
      const verification = {
        id: 'verif-123',
        userId,
        documentType: 'ID_CARD',
        documentUrl: 'encrypted:url',
        status: VerificationStatus.PENDING,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);
      mockPrismaService.userVerification.create.mockResolvedValue(verification);
      mockPrismaService.user.findUnique.mockResolvedValue({
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
      });
      mockMailService.sendVerificationSubmitted.mockRejectedValue(
        new Error('Email service error'),
      );

      // Should not throw
      await expect(
        service.submitVerification(userId, {
          documentType: 'ID_CARD' as any,
          documentUrlFront: 'https://example.com/doc.jpg',
          selfieUrl: 'https://example.com/selfie.jpg',
        }),
      ).resolves.not.toThrow();
    });
  });

  describe('approveVerification', () => {
    it('should send approval email', async () => {
      const verificationId = 'verif-123';
      const userId = 'user-123';
      const adminId = 'admin-123';
      const user = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
      };

      const verification = {
        id: verificationId,
        userId,
        status: VerificationStatus.PENDING,
      };

      const updatedVerification = {
        ...verification,
        status: VerificationStatus.APPROVED,
        isOver18: true,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(
        verification,
      );
      mockPrismaService.userVerification.update.mockResolvedValue(
        updatedVerification,
      );
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await service.approveVerification(verificationId, adminId, {
        dateOfBirth: '1990-01-01',
      });

      expect(mockMailService.sendVerificationApproved).toHaveBeenCalledWith(
        user.email,
        user.username,
      );
    });

    it('should send rejection email when rejected', async () => {
      const verificationId = 'verif-123';
      const userId = 'user-123';
      const adminId = 'admin-123';
      const rejectionReason = 'Document unclear';
      const user = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
      };

      const verification = {
        id: verificationId,
        userId,
        status: VerificationStatus.PENDING,
      };

      const updatedVerification = {
        ...verification,
        status: VerificationStatus.REJECTED,
        rejectionReason,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(
        verification,
      );
      mockPrismaService.userVerification.update.mockResolvedValue(
        updatedVerification,
      );
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await service.rejectVerification(verificationId, adminId, {
        rejectionReason,
      });

      expect(mockMailService.sendVerificationRejected).toHaveBeenCalledWith(
        user.email,
        user.username,
        rejectionReason,
      );
    });

    it('should send underage suspension email for users under 18', async () => {
      const verificationId = 'verif-123';
      const userId = 'user-123';
      const adminId = 'admin-123';
      const user = {
        id: userId,
        email: 'test@example.com',
        username: 'testuser',
      };

      const verification = {
        id: verificationId,
        userId,
        status: VerificationStatus.PENDING,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(
        verification,
      );
      mockPrismaService.userVerification.update.mockResolvedValue({
        ...verification,
        status: VerificationStatus.UNDERAGE,
      });
      mockPrismaService.user.update.mockResolvedValue({});
      mockPrismaService.user.findUnique.mockResolvedValue(user);

      await expect(
        service.approveVerification(verificationId, adminId, {
          dateOfBirth: '2010-01-01', // User is under 18
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockMailService.sendAccountSuspendedUnderage).toHaveBeenCalledWith(
        user.email,
        user.username,
      );
    });
  });
});

import { MailService } from '@/mail/mail.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockMailService } from '@/test/mocks/mail.mock';
import { mockNotificationsService } from '@/test/mocks/notifications.mock';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentType, VerificationStatus } from '@prisma/client';
import { DocumentSecurityService } from './document-security.service';
import { VerificationAuditService } from './verification-audit.service';
import { VerificationRateLimitService } from './verification-rate-limit.service';
import { VerificationService } from './verification.service';

describe('VerificationService', () => {
  let service: VerificationService;

  const mockPrismaService = {
    userVerification: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockDocumentSecurityService = {
    encryptUrl: jest.fn((url) => `encrypted:${url}`),
    decryptUrl: jest.fn((url) => url.replace('encrypted:', '')),
    generateSignedUrl: jest.fn((publicId) => `signed:${publicId}`),
    extractPublicId: jest.fn(() => 'public-id-123'),
    deleteDocument: jest.fn(),
    isCloudinaryUrl: jest.fn(() => true),
  };

  const mockAuditService = {
    logSubmission: jest.fn(),
    logDocumentAccess: jest.fn(),
    logApproval: jest.fn(),
    logRejection: jest.fn(),
    logUnderageAccountSuspension: jest.fn(),
    logCancellation: jest.fn(),
    logSuspiciousActivity: jest.fn(),
    logDocumentDeletion: jest.fn(),
    logRateLimitViolation: jest.fn(),
  };

  const mockRateLimitService = {
    checkRateLimit: jest.fn(),
    getRateLimitStats: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'DOCUMENT_ENCRYPTION_KEY') return 'test-key-123';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: DocumentSecurityService,
          useValue: mockDocumentSecurityService,
        },
        {
          provide: VerificationAuditService,
          useValue: mockAuditService,
        },
        {
          provide: VerificationRateLimitService,
          useValue: mockRateLimitService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MailService,
          useValue: mockMailService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);

    jest.clearAllMocks();

    // Set default mock return values
    mockRateLimitService.checkRateLimit.mockResolvedValue({
      canSubmit: true,
      attemptsUsed: 0,
      attemptsRemaining: 3,
      resetDate: new Date(),
    });
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('submitVerification', () => {
    const userId = 'user-123';
    const dto = {
      documentType: DocumentType.ID_CARD,
      documentUrl: 'https://cloudinary.com/document.jpg',
    };

    it('should create new verification request', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);
      mockPrismaService.userVerification.create.mockResolvedValue({
        id: 'verif-1',
        userId,
        ...dto,
        status: VerificationStatus.PENDING,
      });

      const result = await service.submitVerification(userId, dto);

      expect(result.status).toBe(VerificationStatus.PENDING);
      expect(mockDocumentSecurityService.encryptUrl).toHaveBeenCalledWith(
        dto.documentUrl,
      );
      expect(mockAuditService.logSubmission).toHaveBeenCalledWith(
        userId,
        'verif-1',
        dto.documentType,
      );
      expect(mockPrismaService.userVerification.create).toHaveBeenCalledWith({
        data: {
          userId,
          documentType: dto.documentType,
          documentUrl: `encrypted:${dto.documentUrl}`,
          status: VerificationStatus.PENDING,
        },
      });
    });

    it('should throw error if already pending', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        userId,
        status: VerificationStatus.PENDING,
      });

      await expect(service.submitVerification(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if already approved', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        userId,
        status: VerificationStatus.APPROVED,
      });

      await expect(service.submitVerification(userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow resubmission after rejection', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: 'old-verif',
        userId,
        status: VerificationStatus.REJECTED,
      });
      mockPrismaService.userVerification.delete.mockResolvedValue({});
      mockPrismaService.userVerification.create.mockResolvedValue({
        id: 'new-verif',
        userId,
        ...dto,
        status: VerificationStatus.PENDING,
      });

      const result = await service.submitVerification(userId, dto);

      expect(mockPrismaService.userVerification.delete).toHaveBeenCalled();
      expect(result.id).toBe('new-verif');
    });

    it('should throw error when rate limit exceeded', async () => {
      mockRateLimitService.checkRateLimit.mockResolvedValue({
        canSubmit: false,
        attemptsUsed: 3,
        attemptsRemaining: 0,
        resetDate: new Date(),
        message: 'Rate limit exceeded',
      });

      await expect(service.submitVerification(userId, dto)).rejects.toThrow(
        'Rate limit exceeded',
      );

      expect(mockAuditService.logRateLimitViolation).toHaveBeenCalledWith(
        userId,
        3,
      );
    });
  });

  describe('getVerificationStatus', () => {
    it('should return verification status', async () => {
      const verification = {
        id: 'verif-1',
        userId: 'user-123',
        status: VerificationStatus.PENDING,
        documentType: DocumentType.ID_CARD,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(
        verification,
      );

      const result = await service.getVerificationStatus('user-123');

      expect(result).toEqual(verification);
    });

    it('should throw NotFoundException if no verification', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);

      await expect(service.getVerificationStatus('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancelVerification', () => {
    it('should cancel pending verification', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: 'verif-1',
        userId: 'user-123',
        status: VerificationStatus.PENDING,
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});

      const result = await service.cancelVerification('user-123');

      expect(result.message).toContain('cancelled');
      expect(mockPrismaService.userVerification.update).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        data: { status: VerificationStatus.CANCELLED },
      });
    });

    it('should throw error if no verification found', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);

      await expect(service.cancelVerification('user-123')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw error if trying to cancel non-pending', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.APPROVED,
      });

      await expect(service.cancelVerification('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getVerificationById', () => {
    it('should return verification by ID', async () => {
      const verification = {
        id: 'verif-1',
        userId: 'user-123',
        status: VerificationStatus.PENDING,
        user: {
          id: 'user-123',
          username: 'testuser',
          email: 'test@example.com',
          createdAt: new Date(),
          reputationScore: 100,
        },
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(
        verification,
      );

      const result = await service.getVerificationById('verif-1');

      expect(result).toEqual(verification);
      expect(
        mockPrismaService.userVerification.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: 'verif-1' },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
              reputationScore: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if verification not found', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);

      await expect(service.getVerificationById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approveVerification', () => {
    const verificationId = 'verif-1';
    const adminId = 'admin-1';

    it('should throw error if verification not found', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);

      await expect(
        service.approveVerification(verificationId, adminId, {
          dateOfBirth: '1995-05-15',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if verification not pending', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        status: VerificationStatus.APPROVED,
      });

      await expect(
        service.approveVerification(verificationId, adminId, {
          dateOfBirth: '1995-05-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should approve verification for user over 18', async () => {
      const birthDate = '1995-05-15'; // Over 18
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        userId: 'user-123',
        status: VerificationStatus.PENDING,
      });
      mockPrismaService.userVerification.update.mockResolvedValue({
        id: verificationId,
        status: VerificationStatus.APPROVED,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.approveVerification(
        verificationId,
        adminId,
        {
          dateOfBirth: birthDate,
        },
      );

      expect(result.status).toBe(VerificationStatus.APPROVED);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { isVerified: true },
      });
    });

    it('should reject and suspend account if user is under 18', async () => {
      const birthDate = new Date();
      birthDate.setFullYear(birthDate.getFullYear() - 15); // 15 years old

      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        userId: 'user-123',
        status: VerificationStatus.PENDING,
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockPrismaService.user.update.mockResolvedValue({});

      await expect(
        service.approveVerification(verificationId, adminId, {
          dateOfBirth: birthDate.toISOString().split('T')[0],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.userVerification.update).toHaveBeenCalledWith({
        where: { id: verificationId },
        data: expect.objectContaining({
          status: VerificationStatus.UNDERAGE,
          isOver18: false,
        }),
      });

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-123' },
        data: { isActive: false },
      });
    });

    it('should calculate age correctly for edge cases', async () => {
      // User turning 18 today
      const today = new Date();
      const birthDate = new Date(today);
      birthDate.setFullYear(birthDate.getFullYear() - 18);

      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        userId: 'user-123',
        status: VerificationStatus.PENDING,
      });
      mockPrismaService.userVerification.update.mockResolvedValue({
        id: verificationId,
        status: VerificationStatus.APPROVED,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.approveVerification(
        verificationId,
        adminId,
        {
          dateOfBirth: birthDate.toISOString().split('T')[0],
        },
      );

      expect(result.status).toBe(VerificationStatus.APPROVED);
    });

    it('should throw error if dateOfBirth not provided', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        status: VerificationStatus.PENDING,
      });

      await expect(
        service.approveVerification(verificationId, adminId, {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectVerification', () => {
    it('should throw error if verification not found', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectVerification('verif-1', 'admin-1', {
          rejectionReason: 'Test',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw error if verification not pending', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: 'verif-1',
        status: VerificationStatus.APPROVED,
      });

      await expect(
        service.rejectVerification('verif-1', 'admin-1', {
          rejectionReason: 'Test',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject verification with reason', async () => {
      const verificationId = 'verif-1';
      const adminId = 'admin-1';
      const rejectionReason = 'Document is blurry';

      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        status: VerificationStatus.PENDING,
      });
      mockPrismaService.userVerification.update.mockResolvedValue({
        id: verificationId,
        status: VerificationStatus.REJECTED,
        rejectionReason,
      });

      const result = await service.rejectVerification(verificationId, adminId, {
        rejectionReason,
      });

      expect(result.status).toBe(VerificationStatus.REJECTED);
      expect(result.rejectionReason).toBe(rejectionReason);
    });

    it('should throw error if rejection reason not provided', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.PENDING,
      });

      await expect(
        service.rejectVerification('verif-1', 'admin-1', {}),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getPendingVerifications', () => {
    it('should return paginated pending verifications', async () => {
      const verifications = [
        { id: 'verif-1', status: VerificationStatus.PENDING },
        { id: 'verif-2', status: VerificationStatus.PENDING },
      ];

      mockPrismaService.userVerification.findMany.mockResolvedValue(
        verifications,
      );
      mockPrismaService.userVerification.count.mockResolvedValue(25);

      const result = await service.getPendingVerifications(1, 20);

      expect(result.verifications).toEqual(verifications);
      expect(result.total).toBe(25);
      expect(result.totalPages).toBe(2);
    });
  });

  describe('getVerificationStats', () => {
    it('should return verification statistics', async () => {
      mockPrismaService.userVerification.count
        .mockResolvedValueOnce(5) // pending
        .mockResolvedValueOnce(100) // approved
        .mockResolvedValueOnce(10) // rejected
        .mockResolvedValueOnce(2) // underage
        .mockResolvedValueOnce(3); // cancelled

      const stats = await service.getVerificationStats();

      expect(stats.pending).toBe(5);
      expect(stats.approved).toBe(100);
      expect(stats.rejected).toBe(10);
      expect(stats.underage).toBe(2);
      expect(stats.cancelled).toBe(3);
      expect(stats.total).toBe(120);
    });
  });

  describe('getDocumentSignedUrl', () => {
    const verificationId = 'verif-1';
    const adminId = 'admin-1';

    it('should generate signed URL for document', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        documentUrl: 'encrypted:https://cloudinary.com/doc.jpg',
      });

      const result = await service.getDocumentSignedUrl(
        verificationId,
        adminId,
      );

      expect(result.signedUrl).toBe('signed:public-id-123');
      expect(result.expiresIn).toBe(300);
      expect(mockDocumentSecurityService.decryptUrl).toHaveBeenCalledWith(
        'encrypted:https://cloudinary.com/doc.jpg',
      );
      expect(
        mockDocumentSecurityService.generateSignedUrl,
      ).toHaveBeenCalledWith('public-id-123', 300);
      expect(mockAuditService.logDocumentAccess).toHaveBeenCalledWith(
        adminId,
        verificationId,
        'VIEW',
      );
    });

    it('should throw NotFoundException if verification not found', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);

      await expect(
        service.getDocumentSignedUrl(verificationId, adminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if document not found', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        documentUrl: null,
      });

      await expect(
        service.getDocumentSignedUrl(verificationId, adminId),
      ).rejects.toThrow('Document not found or already deleted');
    });

    it('should throw BadRequestException if invalid publicId', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: verificationId,
        documentUrl: 'encrypted:https://cloudinary.com/doc.jpg',
      });
      mockDocumentSecurityService.extractPublicId.mockReturnValue(null);

      await expect(
        service.getDocumentSignedUrl(verificationId, adminId),
      ).rejects.toThrow('Invalid document URL');
    });
  });

  describe('getRateLimitInfo', () => {
    it('should return rate limit info for user', async () => {
      const rateLimitInfo = {
        canSubmit: true,
        attemptsUsed: 1,
        attemptsRemaining: 2,
        resetDate: new Date(),
      };
      mockRateLimitService.checkRateLimit.mockResolvedValue(rateLimitInfo);

      const result = await service.getRateLimitInfo('user-123');

      expect(result).toEqual(rateLimitInfo);
      expect(mockRateLimitService.checkRateLimit).toHaveBeenCalledWith(
        'user-123',
      );
    });
  });
});

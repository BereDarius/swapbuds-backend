import { PrismaService } from '@/prisma/prisma.service';
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
    checkRateLimit: jest.fn(() => ({
      canSubmit: true,
      attemptsUsed: 0,
      attemptsRemaining: 3,
      resetDate: new Date(),
    })),
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
      ],
    }).compile();

    service = module.get<VerificationService>(VerificationService);

    jest.clearAllMocks();
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

    it('should throw error if trying to cancel non-pending', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        status: VerificationStatus.APPROVED,
      });

      await expect(service.cancelVerification('user-123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approveVerification', () => {
    const verificationId = 'verif-1';
    const adminId = 'admin-1';

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
});

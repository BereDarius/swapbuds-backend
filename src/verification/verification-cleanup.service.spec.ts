import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  mockDocumentSecurityService,
  mockVerificationAuditService,
} from '@/test/mocks/verification.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationStatus } from '@prisma/client';
import { DocumentSecurityService } from './document-security.service';
import { VerificationAuditService } from './verification-audit.service';
import { VerificationCleanupService } from './verification-cleanup.service';

describe('VerificationCleanupService', () => {
  let service: VerificationCleanupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationCleanupService,
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
          useValue: mockVerificationAuditService,
        },
      ],
    }).compile();

    service = module.get<VerificationCleanupService>(
      VerificationCleanupService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('deleteOldApprovedDocuments', () => {
    it('should delete approved documents older than 30 days', async () => {
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      const mockVerifications = [
        {
          id: 'verif-1',
          userId: 'user-1',
          status: VerificationStatus.APPROVED,
          reviewedAt: oldDate,
          documentUrlFront: 'encrypted-url-1',
          documentUrlBack: null,
          selfieUrl: null,
          notes: null,
        },
        {
          id: 'verif-2',
          userId: 'user-2',
          status: VerificationStatus.APPROVED,
          reviewedAt: oldDate,
          documentUrlFront: 'encrypted-url-2',
          documentUrlBack: null,
          selfieUrl: null,
          notes: 'Some notes',
        },
      ];

      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockVerifications,
      );
      mockDocumentSecurityService.decryptUrl.mockImplementation(
        (url) => `decrypted-${url}`,
      );
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument.mockResolvedValue({
        result: 'ok',
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await service.deleteOldApprovedDocuments();

      expect(mockPrismaService.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: VerificationStatus.APPROVED,
            reviewedAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
            OR: expect.arrayContaining([
              { documentUrlFront: { not: null } },
              { documentUrlBack: { not: null } },
              { selfieUrl: { not: null } },
            ]),
          }),
        }),
      );
      expect(mockDocumentSecurityService.deleteDocument).toHaveBeenCalledTimes(
        2,
      );
      expect(mockPrismaService.userVerification.update).toHaveBeenCalledTimes(
        2,
      );
      expect(
        mockVerificationAuditService.logDocumentDeletion,
      ).toHaveBeenCalledTimes(2);
    });

    it('should handle deletion errors gracefully', async () => {
      const mockVerifications = [
        {
          id: 'verif-1',
          userId: 'user-1',
          status: VerificationStatus.APPROVED,
          reviewedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
          documentUrlFront: 'encrypted-url-1',
          documentUrlBack: null,
          selfieUrl: null,
          notes: null,
        },
        {
          id: 'verif-2',
          userId: 'user-2',
          status: VerificationStatus.APPROVED,
          reviewedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
          documentUrlFront: 'encrypted-url-2',
          documentUrlBack: null,
          selfieUrl: null,
          notes: null,
        },
      ];

      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockVerifications,
      );
      mockDocumentSecurityService.decryptUrl.mockImplementation(
        (url) => `decrypted-${url}`,
      );
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument
        .mockRejectedValueOnce(new Error('Deletion failed'))
        .mockResolvedValueOnce({ result: 'ok' });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await service.deleteOldApprovedDocuments();

      // Should continue after error
      expect(mockDocumentSecurityService.deleteDocument).toHaveBeenCalledTimes(
        2,
      );
      expect(mockPrismaService.userVerification.update).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should not delete documents if none are old enough', async () => {
      mockPrismaService.userVerification.findMany.mockResolvedValue([]);

      await service.deleteOldApprovedDocuments();

      expect(mockDocumentSecurityService.deleteDocument).not.toHaveBeenCalled();
      expect(mockPrismaService.userVerification.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteOldRejectedDocuments', () => {
    it('should delete rejected documents older than 90 days', async () => {
      const oldDate = new Date(Date.now() - 95 * 24 * 60 * 60 * 1000);
      const mockVerifications = [
        {
          id: 'verif-1',
          userId: 'user-1',
          status: VerificationStatus.REJECTED,
          reviewedAt: oldDate,
          documentUrlFront: 'encrypted-url-1',
          documentUrlBack: null,
          selfieUrl: null,
          notes: null,
        },
        {
          id: 'verif-2',
          userId: 'user-2',
          status: VerificationStatus.UNDERAGE,
          reviewedAt: oldDate,
          documentUrlFront: 'encrypted-url-2',
          documentUrlBack: null,
          selfieUrl: null,
          notes: null,
        },
      ];

      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockVerifications,
      );
      mockDocumentSecurityService.decryptUrl.mockImplementation(
        (url) => `decrypted-${url}`,
      );
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument.mockResolvedValue({
        result: 'ok',
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await service.deleteOldRejectedDocuments();

      expect(mockPrismaService.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: {
              in: [VerificationStatus.REJECTED, VerificationStatus.UNDERAGE],
            },
            reviewedAt: expect.objectContaining({
              lte: expect.any(Date),
            }),
          }),
        }),
      );
      expect(mockDocumentSecurityService.deleteDocument).toHaveBeenCalledTimes(
        2,
      );
      expect(
        mockVerificationAuditService.logDocumentDeletion,
      ).toHaveBeenCalledWith(
        'verif-1',
        'AUTO_DELETION_REJECTED',
        expect.any(Number),
      );
    });
  });

  describe('deleteDocumentManually', () => {
    it('should delete document manually for GDPR request', async () => {
      const mockVerification = {
        id: 'verif-1',
        userId: 'user-1',
        documentUrlFront: 'encrypted-url',
        documentUrlBack: null,
        selfieUrl: null,
        reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        notes: null,
      };

      mockPrismaService.userVerification.findUnique.mockResolvedValue(
        mockVerification,
      );
      mockDocumentSecurityService.decryptUrl.mockReturnValue('decrypted-url');
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument.mockResolvedValue({
        result: 'ok',
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await service.deleteDocumentManually('verif-1');

      expect(
        mockPrismaService.userVerification.findUnique,
      ).toHaveBeenCalledWith({
        where: { id: 'verif-1' },
      });
      expect(mockDocumentSecurityService.deleteDocument).toHaveBeenCalledWith(
        'documents/test',
      );
      expect(
        mockVerificationAuditService.logDocumentDeletion,
      ).toHaveBeenCalledWith('verif-1', 'MANUAL', expect.any(Number));
    });

    it('should throw error if verification not found', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);

      await expect(
        service.deleteDocumentManually('nonexistent'),
      ).rejects.toThrow('Verification not found or documents already deleted');
    });

    it('should throw error if document already deleted', async () => {
      mockPrismaService.userVerification.findUnique.mockResolvedValue({
        id: 'verif-1',
        documentUrlFront: null,
        documentUrlBack: null,
        selfieUrl: null,
      });

      await expect(service.deleteDocumentManually('verif-1')).rejects.toThrow(
        'Verification not found or documents already deleted',
      );
    });
  });

  describe('getCleanupStats', () => {
    it('should return cleanup statistics', async () => {
      mockPrismaService.userVerification.count
        .mockResolvedValueOnce(5) // pending approved deletion
        .mockResolvedValueOnce(3); // pending rejected deletion

      const stats = await service.getCleanupStats();

      expect(stats).toEqual({
        pendingApprovedDeletion: 5,
        pendingRejectedDeletion: 3,
        totalPendingDeletion: 8,
        policies: {
          approvedDays: 30,
          rejectedDays: 90,
          underageDays: 90,
        },
      });
    });

    it('should query correct date ranges', async () => {
      mockPrismaService.userVerification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      await service.getCleanupStats();

      const calls = mockPrismaService.userVerification.count.mock.calls;

      // First call should check approved docs older than 30 days
      expect(calls[0][0].where.status).toBe(VerificationStatus.APPROVED);

      // Second call should check rejected/underage docs older than 90 days
      expect(calls[1][0].where.status.in).toContain(
        VerificationStatus.REJECTED,
      );
      expect(calls[1][0].where.status.in).toContain(
        VerificationStatus.UNDERAGE,
      );
    });

    it('should return zero when no documents pending deletion', async () => {
      mockPrismaService.userVerification.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const stats = await service.getCleanupStats();

      expect(stats.pendingApprovedDeletion).toBe(0);
      expect(stats.pendingRejectedDeletion).toBe(0);
      expect(stats.totalPendingDeletion).toBe(0);
    });
  });

  describe('deleteVerificationDocument', () => {
    it('should delete front, back, and selfie documents', async () => {
      const mockVerification = {
        id: 'verif-1',
        documentUrlFront: 'encrypted-front',
        documentUrlBack: 'encrypted-back',
        selfieUrl: 'encrypted-selfie',
        reviewedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        notes: null,
      };

      mockDocumentSecurityService.decryptUrl.mockImplementation(
        (url) => `decrypted-${url}`,
      );
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument.mockResolvedValue({
        result: 'ok',
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await (service as any).deleteVerificationDocument(
        mockVerification,
        'MANUAL',
      );

      expect(mockDocumentSecurityService.deleteDocument).toHaveBeenCalledTimes(
        3,
      );
      expect(mockPrismaService.userVerification.update).toHaveBeenCalledWith({
        where: { id: 'verif-1' },
        data: expect.objectContaining({
          documentUrlFront: null,
          documentUrlBack: null,
          selfieUrl: null,
          notes: expect.stringContaining('Documents deleted: MANUAL'),
        }),
      });
    });

    it('should handle documents without back or selfie', async () => {
      const mockVerification = {
        id: 'verif-1',
        documentUrlFront: 'encrypted-front',
        documentUrlBack: null,
        selfieUrl: null,
        reviewedAt: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
        notes: null,
      };

      mockDocumentSecurityService.decryptUrl.mockReturnValue('decrypted-url');
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument.mockResolvedValue({
        result: 'ok',
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await (service as any).deleteVerificationDocument(
        mockVerification,
        'MANUAL',
      );

      expect(mockDocumentSecurityService.deleteDocument).toHaveBeenCalledTimes(
        1,
      );
    });

    it('should append to existing notes', async () => {
      const mockVerification = {
        id: 'verif-1',
        documentUrlFront: 'encrypted-front',
        documentUrlBack: null,
        selfieUrl: null,
        reviewedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        notes: 'Previous notes',
      };

      mockDocumentSecurityService.decryptUrl.mockReturnValue('decrypted-url');
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument.mockResolvedValue({
        result: 'ok',
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await (service as any).deleteVerificationDocument(
        mockVerification,
        'MANUAL',
      );

      expect(mockPrismaService.userVerification.update).toHaveBeenCalledWith({
        where: { id: 'verif-1' },
        data: expect.objectContaining({
          notes: expect.stringContaining('Previous notes'),
        }),
      });
    });

    it('should skip non-Cloudinary URLs', async () => {
      const mockVerification = {
        id: 'verif-1',
        documentUrlFront: 'data:image/png;base64,abc',
        documentUrlBack: null,
        selfieUrl: null,
        reviewedAt: new Date(),
        notes: null,
      };

      mockDocumentSecurityService.decryptUrl.mockReturnValue(
        'data:image/png;base64,abc',
      );
      mockDocumentSecurityService.extractPublicId.mockReturnValue('');
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(false);
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await (service as any).deleteVerificationDocument(
        mockVerification,
        'MANUAL',
      );

      expect(mockDocumentSecurityService.deleteDocument).not.toHaveBeenCalled();
      expect(mockPrismaService.userVerification.update).toHaveBeenCalled();
    });

    it('should handle verification without reviewedAt', async () => {
      const mockVerification = {
        id: 'verif-1',
        documentUrlFront: 'encrypted-front',
        documentUrlBack: null,
        selfieUrl: null,
        reviewedAt: null,
        notes: null,
      };

      mockDocumentSecurityService.decryptUrl.mockReturnValue('decrypted-url');
      mockDocumentSecurityService.extractPublicId.mockReturnValue(
        'documents/test',
      );
      mockDocumentSecurityService.isCloudinaryUrl.mockReturnValue(true);
      mockDocumentSecurityService.deleteDocument.mockResolvedValue({
        result: 'ok',
      });
      mockPrismaService.userVerification.update.mockResolvedValue({});
      mockVerificationAuditService.logDocumentDeletion.mockResolvedValue(
        undefined,
      );

      await (service as any).deleteVerificationDocument(
        mockVerification,
        'MANUAL',
      );

      expect(mockPrismaService.userVerification.update).toHaveBeenCalledWith({
        where: { id: 'verif-1' },
        data: expect.objectContaining({
          notes: expect.stringContaining('(0 days after review)'),
        }),
      });
    });
  });
});

import { AdminGuard } from '@/auth/guards/admin.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { mockVerificationService } from '@/test/mocks/verification.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

describe('VerificationController', () => {
  let controller: VerificationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VerificationController],
      providers: [
        {
          provide: VerificationService,
          useValue: mockVerificationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<VerificationController>(VerificationController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('submitVerification', () => {
    it('should submit verification request', async () => {
      const userId = 'user-1';
      const dto = {
        documentType: 'DRIVERS_LICENSE' as const,
        documentUrlFront: 'https://cloudinary.com/document-front.jpg',
        documentUrlBack: 'https://cloudinary.com/document-back.jpg',
        selfieUrl: 'https://cloudinary.com/selfie.jpg',
      };
      const mockResponse = {
        id: 'verif-1',
        status: 'PENDING' as const,
      };

      mockVerificationService.submitVerification.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.submitVerification(userId, dto);

      expect(result).toEqual(mockResponse);
      expect(mockVerificationService.submitVerification).toHaveBeenCalledWith(
        userId,
        dto,
      );
    });
  });

  describe('getMyVerification', () => {
    it('should get user own verification status', async () => {
      const userId = 'user-1';
      const mockResponse = {
        id: 'verif-1',
        status: 'APPROVED' as const,
      };

      mockVerificationService.getVerificationStatus.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getMyVerification(userId);

      expect(result).toEqual(mockResponse);
      expect(
        mockVerificationService.getVerificationStatus,
      ).toHaveBeenCalledWith(userId);
    });
  });

  describe('cancelMyVerification', () => {
    it('should cancel pending verification', async () => {
      const userId = 'user-1';
      const mockResponse = { message: 'Verification cancelled successfully' };

      mockVerificationService.cancelVerification.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.cancelMyVerification(userId);

      expect(result).toEqual(mockResponse);
      expect(mockVerificationService.cancelVerification).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('getPendingVerifications', () => {
    it('should get pending verifications with default pagination', async () => {
      const mockResponse = {
        verifications: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };

      mockVerificationService.getPendingVerifications.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getPendingVerifications();

      expect(result).toEqual(mockResponse);
      expect(
        mockVerificationService.getPendingVerifications,
      ).toHaveBeenCalledWith(1, 20);
    });

    it('should get pending verifications with custom pagination', async () => {
      const mockResponse = {
        verifications: [],
        pagination: { page: 2, limit: 10, total: 0, totalPages: 0 },
      };

      mockVerificationService.getPendingVerifications.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getPendingVerifications('2', '10');

      expect(result).toEqual(mockResponse);
      expect(
        mockVerificationService.getPendingVerifications,
      ).toHaveBeenCalledWith(2, 10);
    });
  });

  describe('getVerificationStats', () => {
    it('should get verification statistics', async () => {
      const mockStats = {
        total: 100,
        pending: 10,
        approved: 70,
        rejected: 15,
        underage: 5,
      };

      mockVerificationService.getVerificationStats.mockResolvedValue(mockStats);

      const result = await controller.getVerificationStats();

      expect(result).toEqual(mockStats);
      expect(
        mockVerificationService.getVerificationStats,
      ).toHaveBeenCalledTimes(1);
    });
  });

  describe('getVerification', () => {
    it('should get verification by ID', async () => {
      const mockVerification = {
        id: 'verif-1',
        userId: 'user-1',
        status: 'PENDING' as const,
      };

      mockVerificationService.getVerificationById.mockResolvedValue(
        mockVerification,
      );

      const result = await controller.getVerification('verif-1');

      expect(result).toEqual(mockVerification);
      expect(mockVerificationService.getVerificationById).toHaveBeenCalledWith(
        'verif-1',
      );
    });
  });

  describe('getDocumentUrl', () => {
    it('should get signed document URL', async () => {
      const adminId = 'admin-1';
      const mockResponse = {
        signedUrl: 'https://cloudinary.com/signed-url',
        expiresIn: 300,
      };

      mockVerificationService.getDocumentSignedUrl.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.getDocumentUrl('verif-1', adminId);

      expect(result).toEqual(mockResponse);
      expect(mockVerificationService.getDocumentSignedUrl).toHaveBeenCalledWith(
        'verif-1',
        adminId,
        'front',
      );
    });
  });

  describe('approveVerification', () => {
    it('should approve verification', async () => {
      const adminId = 'admin-1';
      const dto = {
        dateOfBirth: '1990-01-01',
        notes: 'Document verified',
      };
      const mockResponse = {
        id: 'verif-1',
        status: 'APPROVED' as const,
      };

      mockVerificationService.approveVerification.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.approveVerification(
        'verif-1',
        adminId,
        dto,
      );

      expect(result).toEqual(mockResponse);
      expect(mockVerificationService.approveVerification).toHaveBeenCalledWith(
        'verif-1',
        adminId,
        dto,
      );
    });
  });

  describe('rejectVerification', () => {
    it('should reject verification', async () => {
      const adminId = 'admin-1';
      const dto = {
        reason: 'Document not clear',
        notes: 'Please resubmit with better quality',
      };
      const mockResponse = {
        id: 'verif-1',
        status: 'REJECTED' as const,
      };

      mockVerificationService.rejectVerification.mockResolvedValue(
        mockResponse,
      );

      const result = await controller.rejectVerification(
        'verif-1',
        adminId,
        dto,
      );

      expect(result).toEqual(mockResponse);
      expect(mockVerificationService.rejectVerification).toHaveBeenCalledWith(
        'verif-1',
        adminId,
        dto,
      );
    });
  });
});

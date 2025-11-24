import { GdprController } from '@/gdpr/gdpr.controller';
import { GdprService } from '@/gdpr/gdpr.service';
import { Test, TestingModule } from '@nestjs/testing';

describe('GdprController', () => {
  let controller: GdprController;
  let service: GdprService;

  const mockGdprService = {
    requestDataExport: jest.fn(),
    getDataExport: jest.fn(),
    requestAccountDeletion: jest.fn(),
    cancelAccountDeletion: jest.fn(),
    getDeletionStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GdprController],
      providers: [
        {
          provide: GdprService,
          useValue: mockGdprService,
        },
      ],
    }).compile();

    controller = module.get<GdprController>(GdprController);
    service = module.get<GdprService>(GdprService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('requestDataExport', () => {
    it('should request data export successfully', async () => {
      const userId = 'user-123';
      const exportId = 'export-456';

      mockGdprService.requestDataExport.mockResolvedValue(exportId);

      const result = await controller.requestDataExport(userId);

      expect(result).toEqual({
        message: 'Data export generated successfully',
        exportId,
        expiresIn: '7 days',
      });
      expect(service.requestDataExport).toHaveBeenCalledWith(userId);
    });

    it('should handle export request error', async () => {
      const userId = 'user-123';

      mockGdprService.requestDataExport.mockRejectedValue(
        new Error('Export failed'),
      );

      await expect(controller.requestDataExport(userId)).rejects.toThrow(
        'Export failed',
      );
    });
  });

  describe('downloadDataExport', () => {
    it('should download data export successfully', async () => {
      const exportId = 'export-456';
      const exportData = {
        user: { id: 'user-123', email: 'test@example.com' },
        items: [],
        trades: [],
      };

      mockGdprService.getDataExport.mockResolvedValue(exportData);

      const result = await controller.downloadDataExport(exportId);

      expect(result).toEqual(exportData);
      expect(service.getDataExport).toHaveBeenCalledWith(exportId);
    });

    it('should throw error for non-existent export', async () => {
      const exportId = 'non-existent';

      mockGdprService.getDataExport.mockRejectedValue(
        new Error('Export not found'),
      );

      await expect(controller.downloadDataExport(exportId)).rejects.toThrow(
        'Export not found',
      );
    });
  });

  describe('requestAccountDeletion', () => {
    it('should request account deletion successfully', async () => {
      const userId = 'user-123';
      const deletionData = {
        scheduledDeletion: new Date('2025-12-24'),
        gracePeriod: 30,
      };

      mockGdprService.requestAccountDeletion.mockResolvedValue(deletionData);

      const result = await controller.requestAccountDeletion(userId);

      expect(result).toEqual(deletionData);
      expect(service.requestAccountDeletion).toHaveBeenCalledWith(userId);
    });

    it('should handle deletion request error', async () => {
      const userId = 'user-123';

      mockGdprService.requestAccountDeletion.mockRejectedValue(
        new Error('Deletion failed'),
      );

      await expect(controller.requestAccountDeletion(userId)).rejects.toThrow(
        'Deletion failed',
      );
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should cancel account deletion successfully', async () => {
      const userId = 'user-123';
      const cancelData = {
        message: 'Account deletion cancelled',
        cancelledAt: new Date(),
      };

      mockGdprService.cancelAccountDeletion.mockResolvedValue(cancelData);

      const result = await controller.cancelAccountDeletion(userId);

      expect(result).toEqual(cancelData);
      expect(service.cancelAccountDeletion).toHaveBeenCalledWith(userId);
    });

    it('should handle cancellation error', async () => {
      const userId = 'user-123';

      mockGdprService.cancelAccountDeletion.mockRejectedValue(
        new Error('Cancellation failed'),
      );

      await expect(controller.cancelAccountDeletion(userId)).rejects.toThrow(
        'Cancellation failed',
      );
    });
  });
});

import {
  mockDataDeletionService,
  mockDataExportService,
} from '@/test/mocks/gdpr.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { DataDeletionService } from './data-deletion.service';
import { DataExportService } from './data-export.service';
import { GdprService } from './gdpr.service';

describe('GdprService', () => {
  let service: GdprService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GdprService,
        {
          provide: DataExportService,
          useValue: mockDataExportService,
        },
        {
          provide: DataDeletionService,
          useValue: mockDataDeletionService,
        },
      ],
    }).compile();

    service = module.get<GdprService>(GdprService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestDataExport', () => {
    it('should call dataExportService.generateExport', async () => {
      const userId = 'user-123';
      const exportId = 'export-user-123-123456';

      mockDataExportService.generateExport.mockResolvedValue(exportId);

      const result = await service.requestDataExport(userId);

      expect(mockDataExportService.generateExport).toHaveBeenCalledWith(userId);
      expect(result).toBe(exportId);
    });
  });

  describe('getDataExport', () => {
    it('should call dataExportService.getExport', async () => {
      const exportId = 'export-123';
      const exportData = { profile: {}, items: [] };

      mockDataExportService.getExport.mockResolvedValue(exportData);

      const result = await service.getDataExport(exportId);

      expect(mockDataExportService.getExport).toHaveBeenCalledWith(exportId);
      expect(result).toBe(exportData);
    });
  });

  describe('requestAccountDeletion', () => {
    it('should call dataDeletionService.requestDeletion', async () => {
      const userId = 'user-123';
      const deletionResponse = {
        message: 'Account scheduled for deletion',
        scheduledDeletionDate: new Date(),
        gracePeriodDays: 30,
      };

      mockDataDeletionService.requestDeletion.mockResolvedValue(
        deletionResponse,
      );

      const result = await service.requestAccountDeletion(userId);

      expect(mockDataDeletionService.requestDeletion).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toBe(deletionResponse);
    });
  });

  describe('cancelAccountDeletion', () => {
    it('should call dataDeletionService.cancelDeletion', async () => {
      const userId = 'user-123';
      const cancellationResponse = {
        message: 'Account deletion canceled',
      };

      mockDataDeletionService.cancelDeletion.mockResolvedValue(
        cancellationResponse,
      );

      const result = await service.cancelAccountDeletion(userId);

      expect(mockDataDeletionService.cancelDeletion).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toBe(cancellationResponse);
    });
  });

  describe('getDeletionStatus', () => {
    it('should call dataDeletionService.getDeletionStatus', async () => {
      const userId = 'user-123';
      const statusResponse = {
        deletionRequested: true,
        deletionRequestedAt: new Date(),
        scheduledDeletionAt: new Date(),
        daysRemaining: 15,
        canCancel: true,
      };

      mockDataDeletionService.getDeletionStatus.mockResolvedValue(
        statusResponse,
      );

      const result = await service.getDeletionStatus(userId);

      expect(mockDataDeletionService.getDeletionStatus).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toBe(statusResponse);
    });
  });
});

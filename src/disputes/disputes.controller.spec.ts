import { Test, TestingModule } from '@nestjs/testing';
import { DisputeReason, DisputeStatus } from '@prisma/client';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  mockDisputeWithRelations,
  mockResolvedDisputeWithRelations,
} from '../test/fixtures/dispute.fixture';
import { DisputesController } from './disputes.controller';
import { DisputesService } from './disputes.service';

describe('DisputesController', () => {
  let controller: DisputesController;
  let service: DisputesService;

  const mockDisputesService = {
    createDispute: jest.fn(),
    getUserDisputes: jest.fn(),
    getDispute: jest.fn(),
    getAllDisputes: jest.fn(),
    assignDispute: jest.fn(),
    resolveDispute: jest.fn(),
    closeDispute: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DisputesController],
      providers: [
        {
          provide: DisputesService,
          useValue: mockDisputesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(AdminGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<DisputesController>(DisputesController);
    service = module.get<DisputesService>(DisputesService);
  });

  describe('createDispute', () => {
    const userId = 'user-1';
    const createDto = {
      tradeId: 'trade-1',
      reportedUserId: 'user-2',
      reason: DisputeReason.ITEM_NOT_AS_DESCRIBED,
      description: 'Item was damaged',
    };

    it('should create a dispute', async () => {
      mockDisputesService.createDispute.mockResolvedValue(
        mockDisputeWithRelations,
      );

      const result = await controller.createDispute(userId, createDto);

      expect(result).toEqual(mockDisputeWithRelations);
      expect(service.createDispute).toHaveBeenCalledWith(userId, createDto);
    });
  });

  describe('getUserDisputes', () => {
    const userId = 'user-1';

    it('should return user disputes', async () => {
      const mockDisputes = [
        mockDisputeWithRelations,
        mockResolvedDisputeWithRelations,
      ];
      mockDisputesService.getUserDisputes.mockResolvedValue(mockDisputes);

      const result = await controller.getUserDisputes(userId);

      expect(result).toEqual(mockDisputes);
      expect(service.getUserDisputes).toHaveBeenCalledWith(userId);
    });

    it('should return empty array if user has no disputes', async () => {
      mockDisputesService.getUserDisputes.mockResolvedValue([]);

      const result = await controller.getUserDisputes(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getDispute', () => {
    const disputeId = 'dispute-1';
    const userId = 'user-1';

    it('should return a specific dispute', async () => {
      mockDisputesService.getDispute.mockResolvedValue(
        mockDisputeWithRelations,
      );

      const result = await controller.getDispute(disputeId, userId);

      expect(result).toEqual(mockDisputeWithRelations);
      expect(service.getDispute).toHaveBeenCalledWith(disputeId, userId);
    });
  });

  describe('getAllDisputes', () => {
    it('should return all disputes without filter', async () => {
      const mockDisputes = [
        mockDisputeWithRelations,
        mockResolvedDisputeWithRelations,
      ];
      mockDisputesService.getAllDisputes.mockResolvedValue(mockDisputes);

      const result = await controller.getAllDisputes();

      expect(result).toEqual(mockDisputes);
      expect(service.getAllDisputes).toHaveBeenCalledWith(undefined);
    });

    it('should return filtered disputes by status', async () => {
      mockDisputesService.getAllDisputes.mockResolvedValue([
        mockResolvedDisputeWithRelations,
      ]);

      const result = await controller.getAllDisputes(DisputeStatus.RESOLVED);

      expect(result).toEqual([mockResolvedDisputeWithRelations]);
      expect(service.getAllDisputes).toHaveBeenCalledWith(
        DisputeStatus.RESOLVED,
      );
    });
  });

  describe('assignDispute', () => {
    const disputeId = 'dispute-1';
    const adminId = 'admin-1';

    it('should assign dispute to admin', async () => {
      const assignedDispute = {
        ...mockDisputeWithRelations,
        status: DisputeStatus.UNDER_REVIEW,
        adminId,
        adminUsername: 'admin',
      };
      mockDisputesService.assignDispute.mockResolvedValue(assignedDispute);

      const result = await controller.assignDispute(disputeId, adminId);

      expect(result).toEqual(assignedDispute);
      expect(result.status).toBe(DisputeStatus.UNDER_REVIEW);
      expect(service.assignDispute).toHaveBeenCalledWith(disputeId, adminId);
    });
  });

  describe('resolveDispute', () => {
    const disputeId = 'dispute-1';
    const resolveDto = {
      adminNotes: 'Reviewed evidence',
      resolution: 'Trade will be cancelled',
    };

    it('should resolve dispute', async () => {
      mockDisputesService.resolveDispute.mockResolvedValue(
        mockResolvedDisputeWithRelations,
      );

      const result = await controller.resolveDispute(disputeId, resolveDto);

      expect(result).toEqual(mockResolvedDisputeWithRelations);
      expect(result.status).toBe(DisputeStatus.RESOLVED);
      expect(service.resolveDispute).toHaveBeenCalledWith(
        disputeId,
        resolveDto,
      );
    });
  });

  describe('closeDispute', () => {
    const disputeId = 'dispute-1';

    it('should close dispute', async () => {
      const closedDispute = {
        ...mockDisputeWithRelations,
        status: DisputeStatus.CLOSED,
        resolvedAt: new Date(),
      };
      mockDisputesService.closeDispute.mockResolvedValue(closedDispute);

      const result = await controller.closeDispute(disputeId);

      expect(result).toEqual(closedDispute);
      expect(result.status).toBe(DisputeStatus.CLOSED);
      expect(service.closeDispute).toHaveBeenCalledWith(disputeId);
    });
  });
});

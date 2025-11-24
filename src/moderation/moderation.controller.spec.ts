import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ModeratorGuard } from '@/auth/guards/moderator.guard';
import { mockModerationService } from '@/test/mocks/moderation.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { FlagReason, ModerationStatus } from '@prisma/client';
import { ModerationController } from './moderation.controller';
import { ModerationService } from './moderation.service';

describe('ModerationController', () => {
  let controller: ModerationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ModerationController],
      providers: [
        {
          provide: ModerationService,
          useValue: mockModerationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(ModeratorGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<ModerationController>(ModerationController);

    // Reset mocks
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('flagItem', () => {
    it('should flag an item', async () => {
      const itemId = 'item-1';
      const dto = {
        reason: FlagReason.SPAM,
        description: 'This is spam',
      };
      const req = {
        user: { userId: 'user-1' },
        ip: '127.0.0.1',
      };

      const mockResult = {
        id: 'flag-1',
        itemId,
        reportedById: req.user.userId,
        reason: dto.reason,
        description: dto.description,
      };

      mockModerationService.flagItem.mockResolvedValue(mockResult);

      const result = await controller.flagItem(itemId, dto, req as any);

      expect(result).toEqual(mockResult);
      expect(mockModerationService.flagItem).toHaveBeenCalledWith(
        itemId,
        req.user.userId,
        dto,
        req.ip,
      );
    });
  });

  describe('getFlaggedItems', () => {
    it('should return paginated flagged items', async () => {
      const mockResult = {
        items: [
          {
            id: 'flag-1',
            itemId: 'item-1',
            reason: FlagReason.SPAM,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          totalPages: 1,
        },
      };

      mockModerationService.getFlaggedItems.mockResolvedValue(mockResult);

      const result = await controller.getFlaggedItems();

      expect(result).toEqual(mockResult);
      expect(mockModerationService.getFlaggedItems).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        status: undefined,
        reason: undefined,
      });
    });

    it('should accept query parameters', async () => {
      const mockResult = {
        items: [],
        pagination: {
          page: 2,
          limit: 10,
          total: 0,
          totalPages: 0,
        },
      };

      mockModerationService.getFlaggedItems.mockResolvedValue(mockResult);

      await controller.getFlaggedItems(
        '2',
        '10',
        ModerationStatus.PENDING,
        FlagReason.SPAM,
      );

      expect(mockModerationService.getFlaggedItems).toHaveBeenCalledWith({
        page: 2,
        limit: 10,
        status: ModerationStatus.PENDING,
        reason: FlagReason.SPAM,
      });
    });
  });

  describe('getFlaggedItem', () => {
    it('should return a single flagged item', async () => {
      const flagId = 'flag-1';
      const mockResult = {
        id: flagId,
        itemId: 'item-1',
        reason: FlagReason.SPAM,
      };

      mockModerationService.getFlaggedItem.mockResolvedValue(mockResult);

      const result = await controller.getFlaggedItem(flagId);

      expect(result).toEqual(mockResult);
      expect(mockModerationService.getFlaggedItem).toHaveBeenCalledWith(flagId);
    });
  });

  describe('approveItem', () => {
    it('should approve a flagged item', async () => {
      const flagId = 'flag-1';
      const dto = { notes: 'False alarm' };
      const req = {
        user: { userId: 'admin-1' },
        ip: '127.0.0.1',
      };

      const mockResult = {
        id: flagId,
        status: ModerationStatus.APPROVED,
        reviewedById: req.user.userId,
        reviewNotes: dto.notes,
      };

      mockModerationService.approveItem.mockResolvedValue(mockResult);

      const result = await controller.approveItem(flagId, dto, req as any);

      expect(result).toEqual(mockResult);
      expect(mockModerationService.approveItem).toHaveBeenCalledWith(
        flagId,
        req.user.userId,
        dto,
        req.ip,
      );
    });
  });

  describe('removeItem', () => {
    it('should remove a flagged item', async () => {
      const flagId = 'flag-1';
      const dto = {
        reason: 'Confirmed spam',
        notifyUser: true,
      };
      const req = {
        user: { userId: 'admin-1' },
        ip: '127.0.0.1',
      };

      const mockResult = {
        id: flagId,
        status: ModerationStatus.REMOVED,
        reviewedById: req.user.userId,
        reviewNotes: dto.reason,
      };

      mockModerationService.removeItem.mockResolvedValue(mockResult);

      const result = await controller.removeItem(flagId, dto, req as any);

      expect(result).toEqual(mockResult);
      expect(mockModerationService.removeItem).toHaveBeenCalledWith(
        flagId,
        req.user.userId,
        dto,
        req.ip,
      );
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      const mockStats = {
        total: 10,
        pending: 4,
        approved: 3,
        removed: 3,
        byReason: [
          { reason: FlagReason.SPAM, count: 5 },
          { reason: FlagReason.SCAM, count: 3 },
        ],
        recentFlags: [],
      };

      mockModerationService.getModerationStats.mockResolvedValue(mockStats);

      const result = await controller.getModerationStats();

      expect(result).toEqual(mockStats);
      expect(mockModerationService.getModerationStats).toHaveBeenCalled();
    });
  });

  describe('bulkApprove', () => {
    it('should bulk approve flagged items', async () => {
      const dto = {
        flaggedItemIds: ['flag-1', 'flag-2', 'flag-3'],
        notes: 'Approved after review',
      };
      const req = {
        user: { userId: 'moderator-1' },
        ip: '127.0.0.1',
      };

      const mockResult = {
        approved: 3,
        failed: 0,
        results: [
          { id: 'flag-1', status: 'approved' },
          { id: 'flag-2', status: 'approved' },
          { id: 'flag-3', status: 'approved' },
        ],
      };

      mockModerationService.bulkApprove.mockResolvedValue(mockResult);

      const result = await controller.bulkApprove(dto, req as any);

      expect(result).toEqual(mockResult);
      expect(mockModerationService.bulkApprove).toHaveBeenCalledWith(
        dto.flaggedItemIds,
        req.user.userId,
        dto.notes,
        req.ip,
      );
    });
  });

  describe('bulkReject', () => {
    it('should bulk reject flagged items', async () => {
      const dto = {
        flaggedItemIds: ['flag-1', 'flag-2'],
        reason: 'Not a valid flag',
      };
      const req = {
        user: { userId: 'moderator-1' },
        ip: '127.0.0.1',
      };

      const mockResult = {
        rejected: 2,
        failed: 0,
        results: [
          { id: 'flag-1', status: 'rejected' },
          { id: 'flag-2', status: 'rejected' },
        ],
      };

      mockModerationService.bulkReject.mockResolvedValue(mockResult);

      const result = await controller.bulkReject(dto, req as any);

      expect(result).toEqual(mockResult);
      expect(mockModerationService.bulkReject).toHaveBeenCalledWith(
        dto.flaggedItemIds,
        req.user.userId,
        dto.reason,
        req.ip,
      );
    });
  });

  describe('bulkRemove', () => {
    it('should bulk remove flagged items', async () => {
      const dto = {
        flaggedItemIds: ['flag-1', 'flag-2', 'flag-3'],
        reason: 'Confirmed violations',
      };
      const req = {
        user: { userId: 'moderator-1' },
        ip: '127.0.0.1',
      };

      const mockResult = {
        removed: 3,
        failed: 0,
        results: [
          { id: 'flag-1', status: 'removed' },
          { id: 'flag-2', status: 'removed' },
          { id: 'flag-3', status: 'removed' },
        ],
      };

      mockModerationService.bulkRemove.mockResolvedValue(mockResult);

      const result = await controller.bulkRemove(dto, req as any);

      expect(result).toEqual(mockResult);
      expect(mockModerationService.bulkRemove).toHaveBeenCalledWith(
        dto.flaggedItemIds,
        req.user.userId,
        dto.reason,
        req.ip,
      );
    });
  });
});

import { AuditLogService } from '@/admin/audit-log.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockAuditLogService } from '@/test/mocks/audit-log.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import {
  AuditAction,
  FlagReason,
  ItemStatus,
  ModerationStatus,
} from '@prisma/client';
import { ModerationService } from './moderation.service';

describe('ModerationService', () => {
  let service: ModerationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ModerationService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    }).compile();

    service = module.get<ModerationService>(ModerationService);

    // Reset mocks
    jest.clearAllMocks();
    mockAuditLogService.log.mockResolvedValue(undefined);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('flagItem', () => {
    it('should flag an item successfully', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const dto = {
        reason: FlagReason.SPAM,
        description: 'This looks like spam',
      };

      const mockItem = {
        id: itemId,
        status: ItemStatus.AVAILABLE,
        userId: 'other-user',
      };

      const mockFlag = {
        id: 'flag-1',
        itemId,
        reportedById: userId,
        reason: dto.reason,
        description: dto.description,
        status: ModerationStatus.PENDING,
        item: {
          id: itemId,
          title: 'Test Item',
          status: ItemStatus.AVAILABLE,
        },
        reportedBy: {
          id: userId,
          username: 'testuser',
          email: 'test@example.com',
        },
      };

      mockPrismaService.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.flaggedItem.findFirst.mockResolvedValue(null);
      mockPrismaService.flaggedItem.create.mockResolvedValue(mockFlag);

      const result = await service.flagItem(itemId, userId, dto, '127.0.0.1');

      expect(result).toEqual(mockFlag);
      expect(mockPrismaService.item.findUnique).toHaveBeenCalledWith({
        where: { id: itemId },
        select: { id: true, status: true, userId: true },
      });
      expect(mockPrismaService.flaggedItem.create).toHaveBeenCalled();
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        performedById: userId,
        action: AuditAction.ITEM_FLAG,
        description: expect.stringContaining('flagged'),
        targetType: 'Item',
        targetId: itemId,
        metadata: expect.any(Object),
        ipAddress: '127.0.0.1',
      });
    });

    it('should throw NotFoundException if item does not exist', async () => {
      const itemId = 'non-existent-item';
      const userId = 'user-1';
      const dto = {
        reason: FlagReason.SPAM,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(null);

      await expect(service.flagItem(itemId, userId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if item is already removed', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const dto = {
        reason: FlagReason.SPAM,
      };

      const mockItem = {
        id: itemId,
        status: ItemStatus.REMOVED,
        userId: 'other-user',
      };

      mockPrismaService.item.findUnique.mockResolvedValue(mockItem);

      await expect(service.flagItem(itemId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.flaggedItem.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if user tries to flag their own item', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const dto = {
        reason: FlagReason.SPAM,
      };

      const mockItem = {
        id: itemId,
        status: ItemStatus.AVAILABLE,
        userId: userId, // Same as reporter
      };

      mockPrismaService.item.findUnique.mockResolvedValue(mockItem);

      await expect(service.flagItem(itemId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if user has already flagged item with same reason', async () => {
      const itemId = 'item-1';
      const userId = 'user-1';
      const dto = {
        reason: FlagReason.SPAM,
      };

      const mockItem = {
        id: itemId,
        status: ItemStatus.AVAILABLE,
        userId: 'other-user',
      };

      const existingFlag = {
        id: 'flag-1',
        itemId,
        reportedById: userId,
        reason: dto.reason,
        status: ModerationStatus.PENDING,
      };

      mockPrismaService.item.findUnique.mockResolvedValue(mockItem);
      mockPrismaService.flaggedItem.findFirst.mockResolvedValue(existingFlag);

      await expect(service.flagItem(itemId, userId, dto)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrismaService.flaggedItem.create).not.toHaveBeenCalled();
    });
  });

  describe('getFlaggedItems', () => {
    it('should return paginated flagged items', async () => {
      const query = { page: 1, limit: 10 };
      const mockItems = [
        {
          id: 'flag-1',
          itemId: 'item-1',
          reason: FlagReason.SPAM,
          status: ModerationStatus.PENDING,
          item: { id: 'item-1', title: 'Test Item 1' },
        },
        {
          id: 'flag-2',
          itemId: 'item-2',
          reason: FlagReason.SCAM,
          status: ModerationStatus.PENDING,
          item: { id: 'item-2', title: 'Test Item 2' },
        },
      ];

      mockPrismaService.flaggedItem.findMany.mockResolvedValue(mockItems);
      mockPrismaService.flaggedItem.count.mockResolvedValue(2);

      const result = await service.getFlaggedItems(query);

      expect(result.items).toEqual(mockItems);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      const query = {
        page: 1,
        limit: 10,
        status: ModerationStatus.PENDING,
      };

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([]);
      mockPrismaService.flaggedItem.count.mockResolvedValue(0);

      await service.getFlaggedItems(query);

      expect(mockPrismaService.flaggedItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: ModerationStatus.PENDING },
        }),
      );
    });

    it('should filter by reason', async () => {
      const query = {
        page: 1,
        limit: 10,
        reason: FlagReason.SPAM,
      };

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([]);
      mockPrismaService.flaggedItem.count.mockResolvedValue(0);

      await service.getFlaggedItems(query);

      expect(mockPrismaService.flaggedItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { reason: FlagReason.SPAM },
        }),
      );
    });
  });

  describe('getFlaggedItem', () => {
    it('should return a single flagged item', async () => {
      const flagId = 'flag-1';
      const mockFlag = {
        id: flagId,
        itemId: 'item-1',
        reason: FlagReason.SPAM,
        item: { id: 'item-1', title: 'Test Item' },
      };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(mockFlag);

      const result = await service.getFlaggedItem(flagId);

      expect(result).toEqual(mockFlag);
      expect(mockPrismaService.flaggedItem.findUnique).toHaveBeenCalledWith({
        where: { id: flagId },
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if flagged item does not exist', async () => {
      const flagId = 'non-existent-flag';

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(null);

      await expect(service.getFlaggedItem(flagId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('approveItem', () => {
    it('should approve a flagged item successfully', async () => {
      const flagId = 'flag-1';
      const adminId = 'admin-1';
      const dto = { notes: 'False alarm' };

      const mockFlag = {
        id: flagId,
        itemId: 'item-1',
        status: ModerationStatus.PENDING,
        reason: FlagReason.SPAM,
        item: { id: 'item-1', title: 'Test Item' },
      };

      const updatedFlag = {
        ...mockFlag,
        status: ModerationStatus.APPROVED,
        reviewedById: adminId,
        reviewNotes: dto.notes,
      };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(mockFlag);
      mockPrismaService.flaggedItem.update.mockResolvedValue(updatedFlag);

      const result = await service.approveItem(
        flagId,
        adminId,
        dto,
        '127.0.0.1',
      );

      expect(result.status).toBe(ModerationStatus.APPROVED);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        performedById: adminId,
        action: AuditAction.MODERATION_APPROVE,
        description: expect.stringContaining('Approved'),
        targetType: 'FlaggedItem',
        targetId: flagId,
        metadata: expect.any(Object),
        ipAddress: '127.0.0.1',
      });
    });

    it('should throw NotFoundException if flag does not exist', async () => {
      const flagId = 'non-existent-flag';
      const adminId = 'admin-1';
      const dto = { notes: 'Test' };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(null);

      await expect(service.approveItem(flagId, adminId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if flag is not pending', async () => {
      const flagId = 'flag-1';
      const adminId = 'admin-1';
      const dto = { notes: 'Test' };

      const mockFlag = {
        id: flagId,
        status: ModerationStatus.APPROVED, // Already approved
        item: { id: 'item-1', title: 'Test' },
      };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(mockFlag);

      await expect(service.approveItem(flagId, adminId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeItem', () => {
    it('should remove a flagged item successfully', async () => {
      const flagId = 'flag-1';
      const adminId = 'admin-1';
      const dto = { reason: 'Confirmed spam', notifyUser: true };

      const mockFlag = {
        id: flagId,
        itemId: 'item-1',
        status: ModerationStatus.PENDING,
        reason: FlagReason.SPAM,
        item: {
          id: 'item-1',
          title: 'Test Item',
          status: ItemStatus.AVAILABLE,
        },
      };

      const updatedFlag = {
        ...mockFlag,
        status: ModerationStatus.REMOVED,
        reviewedById: adminId,
        reviewNotes: dto.reason,
      };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(mockFlag);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback({
          flaggedItem: {
            update: jest.fn().mockResolvedValue(updatedFlag),
          },
          item: {
            update: jest.fn().mockResolvedValue({
              id: 'item-1',
              status: ItemStatus.REMOVED,
            }),
          },
        });
      });

      const result = await service.removeItem(
        flagId,
        adminId,
        dto,
        '127.0.0.1',
      );

      expect(result.status).toBe(ModerationStatus.REMOVED);
      expect(mockAuditLogService.log).toHaveBeenCalledWith({
        performedById: adminId,
        action: AuditAction.MODERATION_REMOVE,
        description: expect.stringContaining('Removed'),
        targetType: 'FlaggedItem',
        targetId: flagId,
        metadata: expect.any(Object),
        ipAddress: '127.0.0.1',
      });
    });

    it('should throw NotFoundException if flag does not exist', async () => {
      const flagId = 'non-existent-flag';
      const adminId = 'admin-1';
      const dto = { reason: 'Test' };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(null);

      await expect(service.removeItem(flagId, adminId, dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if flag is not pending', async () => {
      const flagId = 'flag-1';
      const adminId = 'admin-1';
      const dto = { reason: 'Test' };

      const mockFlag = {
        id: flagId,
        status: ModerationStatus.REMOVED, // Already removed
        item: { id: 'item-1', title: 'Test', status: ItemStatus.AVAILABLE },
      };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(mockFlag);

      await expect(service.removeItem(flagId, adminId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if item is already removed', async () => {
      const flagId = 'flag-1';
      const adminId = 'admin-1';
      const dto = { reason: 'Test' };

      const mockFlag = {
        id: flagId,
        status: ModerationStatus.PENDING,
        item: { id: 'item-1', title: 'Test', status: ItemStatus.REMOVED },
      };

      mockPrismaService.flaggedItem.findUnique.mockResolvedValue(mockFlag);

      await expect(service.removeItem(flagId, adminId, dto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getModerationStats', () => {
    it('should return moderation statistics', async () => {
      const mockGroupBy = [
        { reason: FlagReason.SPAM, _count: { id: 5 } },
        { reason: FlagReason.SCAM, _count: { id: 3 } },
      ];

      const mockRecentFlags = [
        { id: 'flag-1', reason: FlagReason.SPAM },
        { id: 'flag-2', reason: FlagReason.SCAM },
      ];

      mockPrismaService.flaggedItem.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(4) // pending
        .mockResolvedValueOnce(3) // approved
        .mockResolvedValueOnce(3); // removed

      mockPrismaService.flaggedItem.groupBy.mockResolvedValue(mockGroupBy);
      mockPrismaService.flaggedItem.findMany.mockResolvedValue(mockRecentFlags);

      const result = await service.getModerationStats();

      expect(result).toEqual({
        total: 10,
        pending: 4,
        approved: 3,
        removed: 3,
        byReason: [
          { reason: FlagReason.SPAM, count: 5 },
          { reason: FlagReason.SCAM, count: 3 },
        ],
        recentFlags: mockRecentFlags,
      });
    });

    it('should handle empty statistics', async () => {
      mockPrismaService.flaggedItem.count.mockResolvedValue(0);
      mockPrismaService.flaggedItem.groupBy.mockResolvedValue([]);
      mockPrismaService.flaggedItem.findMany.mockResolvedValue([]);

      const result = await service.getModerationStats();

      expect(result.total).toBe(0);
      expect(result.byReason).toEqual([]);
      expect(result.recentFlags).toEqual([]);
    });
  });

  describe('bulkApprove', () => {
    it('should bulk approve flagged items successfully', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2', 'flag-3'];
      const moderatorId = 'mod-1';
      const notes = 'All reviewed and approved';

      const mockFlaggedItems = [
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.PENDING,
          reason: FlagReason.SPAM,
          item: { id: 'item-1', title: 'Item 1' },
        },
        {
          id: 'flag-2',
          itemId: 'item-2',
          status: ModerationStatus.PENDING,
          reason: FlagReason.SCAM,
          item: { id: 'item-2', title: 'Item 2' },
        },
        {
          id: 'flag-3',
          itemId: 'item-3',
          status: ModerationStatus.PENDING,
          reason: FlagReason.SPAM,
          item: { id: 'item-3', title: 'Item 3' },
        },
      ];

      mockPrismaService.flaggedItem.findMany.mockResolvedValue(
        mockFlaggedItems,
      );
      mockPrismaService.flaggedItem.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.bulkApprove(
        flaggedItemIds,
        moderatorId,
        notes,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.approvedCount).toBe(3);
      expect(mockPrismaService.flaggedItem.findMany).toHaveBeenCalledWith({
        where: { id: { in: flaggedItemIds } },
        include: { item: true },
      });
      expect(mockPrismaService.flaggedItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: flaggedItemIds } },
        data: {
          status: ModerationStatus.APPROVED,
          reviewedById: moderatorId,
          reviewedAt: expect.any(Date),
          reviewNotes: notes,
        },
      });
      expect(mockAuditLogService.log).toHaveBeenCalledTimes(3);
    });

    it('should throw NotFoundException if some flagged items not found', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2', 'flag-3'];
      const moderatorId = 'mod-1';

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.PENDING,
        },
      ]);

      await expect(
        service.bulkApprove(flaggedItemIds, moderatorId, 'notes'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.bulkApprove(flaggedItemIds, moderatorId, 'notes'),
      ).rejects.toThrow('One or more flagged items not found');
    });

    it('should throw BadRequestException if items are not pending', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2'];
      const moderatorId = 'mod-1';

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.APPROVED,
          item: {},
        },
        {
          id: 'flag-2',
          itemId: 'item-2',
          status: ModerationStatus.PENDING,
          item: {},
        },
      ]);

      await expect(
        service.bulkApprove(flaggedItemIds, moderatorId, 'notes'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.bulkApprove(flaggedItemIds, moderatorId, 'notes'),
      ).rejects.toThrow('Cannot approve items that are not pending');
    });
  });

  describe('bulkReject', () => {
    it('should bulk reject flagged items successfully', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2'];
      const moderatorId = 'mod-1';
      const reason = 'Not a valid violation';

      const mockFlaggedItems = [
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.PENDING,
          reason: FlagReason.SPAM,
          item: { id: 'item-1' },
        },
        {
          id: 'flag-2',
          itemId: 'item-2',
          status: ModerationStatus.PENDING,
          reason: FlagReason.INAPPROPRIATE,
          item: { id: 'item-2' },
        },
      ];

      mockPrismaService.flaggedItem.findMany.mockResolvedValue(
        mockFlaggedItems,
      );
      mockPrismaService.flaggedItem.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkReject(
        flaggedItemIds,
        moderatorId,
        reason,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.rejectedCount).toBe(2);
      expect(mockPrismaService.flaggedItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: flaggedItemIds } },
        data: {
          status: ModerationStatus.APPROVED,
          reviewedById: moderatorId,
          reviewedAt: expect.any(Date),
          reviewNotes: `Rejected: ${reason}`,
        },
      });
      expect(mockAuditLogService.log).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if some flagged items not found', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2'];
      const moderatorId = 'mod-1';

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([]);

      await expect(
        service.bulkReject(flaggedItemIds, moderatorId, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if items are not pending', async () => {
      const flaggedItemIds = ['flag-1'];
      const moderatorId = 'mod-1';

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.REMOVED,
          item: {},
        },
      ]);

      await expect(
        service.bulkReject(flaggedItemIds, moderatorId, 'reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.bulkReject(flaggedItemIds, moderatorId, 'reason'),
      ).rejects.toThrow('Cannot reject items that are not pending');
    });
  });

  describe('bulkRemove', () => {
    it('should bulk remove flagged items successfully', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2'];
      const moderatorId = 'mod-1';
      const reason = 'Confirmed violations';

      const mockFlaggedItems = [
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.PENDING,
          reason: FlagReason.SCAM,
          item: { id: 'item-1' },
        },
        {
          id: 'flag-2',
          itemId: 'item-2',
          status: ModerationStatus.PENDING,
          reason: FlagReason.PROHIBITED,
          item: { id: 'item-2' },
        },
      ];

      mockPrismaService.flaggedItem.findMany.mockResolvedValue(
        mockFlaggedItems,
      );
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 2 });
      mockPrismaService.flaggedItem.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkRemove(
        flaggedItemIds,
        moderatorId,
        reason,
        '127.0.0.1',
      );

      expect(result.success).toBe(true);
      expect(result.removedCount).toBe(2);
      expect(mockPrismaService.item.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['item-1', 'item-2'] } },
        data: { status: ItemStatus.REMOVED },
      });
      expect(mockPrismaService.flaggedItem.updateMany).toHaveBeenCalledWith({
        where: { id: { in: flaggedItemIds } },
        data: {
          status: ModerationStatus.REMOVED,
          reviewedById: moderatorId,
          reviewedAt: expect.any(Date),
          reviewNotes: reason,
        },
      });
      expect(mockAuditLogService.log).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if some flagged items not found', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2', 'flag-3'];
      const moderatorId = 'mod-1';

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.PENDING,
        },
      ]);

      await expect(
        service.bulkRemove(flaggedItemIds, moderatorId, 'reason'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if items are not pending', async () => {
      const flaggedItemIds = ['flag-1', 'flag-2'];
      const moderatorId = 'mod-1';

      mockPrismaService.flaggedItem.findMany.mockResolvedValue([
        {
          id: 'flag-1',
          itemId: 'item-1',
          status: ModerationStatus.PENDING,
          item: {},
        },
        {
          id: 'flag-2',
          itemId: 'item-2',
          status: ModerationStatus.APPROVED,
          item: {},
        },
      ]);

      await expect(
        service.bulkRemove(flaggedItemIds, moderatorId, 'reason'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.bulkRemove(flaggedItemIds, moderatorId, 'reason'),
      ).rejects.toThrow('Cannot remove items that are not pending');
    });
  });

  describe('flagComment', () => {
    it('should flag a comment successfully', async () => {
      const commentId = 'comment-1';
      const userId = 'user-1';
      const dto = {
        reason: FlagReason.INAPPROPRIATE,
        description: 'Offensive language',
      };

      const mockComment = {
        id: commentId,
        isDeleted: false,
        userId: 'different-user',
        content: 'Test comment',
      };

      mockPrismaService.comment.findUnique.mockResolvedValue(mockComment);
      mockPrismaService.flaggedComment.findFirst.mockResolvedValue(null);
      mockPrismaService.flaggedComment.create.mockResolvedValue({
        id: 'flag-1',
        commentId,
        reportedById: userId,
        reason: dto.reason,
        description: dto.description,
        status: ModerationStatus.PENDING,
        comment: mockComment,
        reportedBy: {
          id: userId,
          username: 'user1',
          email: 'user1@test.com',
        },
      });

      const result = await service.flagComment(
        commentId,
        userId,
        dto,
        '127.0.0.1',
      );

      expect(result.commentId).toBe(commentId);
      expect(result.reason).toBe(dto.reason);
      expect(mockAuditLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if comment not found', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue(null);

      await expect(
        service.flagComment('comment-1', 'user-1', {
          reason: FlagReason.SPAM,
          description: 'Spam',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if comment is already deleted', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        isDeleted: true,
        userId: 'user-2',
        content: 'Deleted',
      });

      await expect(
        service.flagComment('comment-1', 'user-1', {
          reason: FlagReason.SPAM,
          description: 'Spam',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.flagComment('comment-1', 'user-1', {
          reason: FlagReason.SPAM,
          description: 'Spam',
        }),
      ).rejects.toThrow('Cannot flag a deleted comment');
    });

    it('should throw BadRequestException if user tries to flag their own comment', async () => {
      const userId = 'user-1';
      mockPrismaService.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        isDeleted: false,
        userId: userId,
        content: 'My comment',
      });

      await expect(
        service.flagComment('comment-1', userId, {
          reason: FlagReason.SPAM,
          description: 'Spam',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.flagComment('comment-1', userId, {
          reason: FlagReason.SPAM,
          description: 'Spam',
        }),
      ).rejects.toThrow('You cannot flag your own comment');
    });

    it('should throw BadRequestException if user already flagged this comment', async () => {
      mockPrismaService.comment.findUnique.mockResolvedValue({
        id: 'comment-1',
        isDeleted: false,
        userId: 'user-2',
        content: 'Comment',
      });
      mockPrismaService.flaggedComment.findFirst.mockResolvedValue({
        id: 'existing-flag',
        commentId: 'comment-1',
        reportedById: 'user-1',
        reason: FlagReason.SPAM,
        status: ModerationStatus.PENDING,
      } as any);

      await expect(
        service.flagComment('comment-1', 'user-1', {
          reason: FlagReason.SPAM,
          description: 'Spam',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.flagComment('comment-1', 'user-1', {
          reason: FlagReason.SPAM,
          description: 'Spam',
        }),
      ).rejects.toThrow(
        'You have already flagged this comment with this reason',
      );
    });
  });

  describe('getFlaggedComments', () => {
    it('should return paginated flagged comments', async () => {
      const mockComments = [
        {
          id: 'flag-1',
          commentId: 'comment-1',
          reason: FlagReason.SPAM,
          status: ModerationStatus.PENDING,
          comment: {
            id: 'comment-1',
            content: 'Test comment',
            user: { id: 'user-1', username: 'user1', email: 'user1@test.com' },
            item: { id: 'item-1', title: 'Test item' },
          },
          reportedBy: {
            id: 'user-2',
            username: 'user2',
            email: 'user2@test.com',
          },
          reviewedBy: null,
        },
      ];

      mockPrismaService.flaggedComment.findMany.mockResolvedValue(mockComments);
      mockPrismaService.flaggedComment.count.mockResolvedValue(1);

      const result = await service.getFlaggedComments({
        page: 1,
        limit: 20,
      });

      expect(result.comments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.totalPages).toBe(1);
    });

    it('should filter by status and reason', async () => {
      mockPrismaService.flaggedComment.findMany.mockResolvedValue([]);
      mockPrismaService.flaggedComment.count.mockResolvedValue(0);

      await service.getFlaggedComments({
        page: 1,
        limit: 20,
        status: ModerationStatus.APPROVED,
        reason: FlagReason.SPAM,
      });

      expect(mockPrismaService.flaggedComment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            status: ModerationStatus.APPROVED,
            reason: FlagReason.SPAM,
          },
        }),
      );
    });
  });

  describe('approveFlaggedComment', () => {
    it('should approve a flagged comment successfully', async () => {
      const flagId = 'flag-1';
      const moderatorId = 'mod-1';
      const dto = { notes: 'No violation found' };

      mockPrismaService.flaggedComment.findUnique.mockResolvedValue({
        id: flagId,
        commentId: 'comment-1',
        status: ModerationStatus.PENDING,
        reason: FlagReason.SPAM,
        comment: { id: 'comment-1', content: 'Comment' },
      });

      await service.approveFlaggedComment(
        flagId,
        moderatorId,
        dto,
        '127.0.0.1',
      );

      expect(mockPrismaService.flaggedComment.update).toHaveBeenCalledWith({
        where: { id: flagId },
        data: {
          status: ModerationStatus.APPROVED,
          reviewedById: moderatorId,
          reviewedAt: expect.any(Date),
          reviewNotes: dto.notes,
        },
      });
      expect(mockAuditLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if flag not found', async () => {
      mockPrismaService.flaggedComment.findUnique.mockResolvedValue(null);

      await expect(
        service.approveFlaggedComment('flag-1', 'mod-1', { notes: 'Notes' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if flag is not pending', async () => {
      mockPrismaService.flaggedComment.findUnique.mockResolvedValue({
        id: 'flag-1',
        commentId: 'comment-1',
        status: ModerationStatus.APPROVED,
        reason: FlagReason.SPAM,
        comment: { id: 'comment-1', content: 'Comment' },
      });

      await expect(
        service.approveFlaggedComment('flag-1', 'mod-1', { notes: 'Notes' }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approveFlaggedComment('flag-1', 'mod-1', { notes: 'Notes' }),
      ).rejects.toThrow('Flag is already approved');
    });
  });

  describe('removeFlaggedComment', () => {
    it('should remove a flagged comment successfully', async () => {
      const flagId = 'flag-1';
      const moderatorId = 'mod-1';
      const dto = { reason: 'Confirmed violation' };

      mockPrismaService.flaggedComment.findUnique.mockResolvedValue({
        id: flagId,
        commentId: 'comment-1',
        status: ModerationStatus.PENDING,
        reason: FlagReason.INAPPROPRIATE,
        comment: { id: 'comment-1', content: 'Offensive comment' },
      });

      await service.removeFlaggedComment(flagId, moderatorId, dto, '127.0.0.1');

      expect(mockPrismaService.comment.update).toHaveBeenCalledWith({
        where: { id: 'comment-1' },
        data: {
          isDeleted: true,
          deletedAt: expect.any(Date),
          deletedBy: moderatorId,
          deleteReason: dto.reason,
        },
      });
      expect(mockPrismaService.flaggedComment.update).toHaveBeenCalledWith({
        where: { id: flagId },
        data: {
          status: ModerationStatus.REMOVED,
          reviewedById: moderatorId,
          reviewedAt: expect.any(Date),
          reviewNotes: dto.reason,
        },
      });
      expect(mockAuditLogService.log).toHaveBeenCalled();
    });

    it('should throw NotFoundException if flag not found', async () => {
      mockPrismaService.flaggedComment.findUnique.mockResolvedValue(null);

      await expect(
        service.removeFlaggedComment('flag-1', 'mod-1', {
          reason: 'Violation',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if flag is not pending', async () => {
      mockPrismaService.flaggedComment.findUnique.mockResolvedValue({
        id: 'flag-1',
        commentId: 'comment-1',
        status: ModerationStatus.REMOVED,
        reason: FlagReason.SPAM,
        comment: { id: 'comment-1', content: 'Comment' },
      });

      await expect(
        service.removeFlaggedComment('flag-1', 'mod-1', {
          reason: 'Violation',
        }),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.removeFlaggedComment('flag-1', 'mod-1', {
          reason: 'Violation',
        }),
      ).rejects.toThrow('Flag is already removed');
    });
  });
});

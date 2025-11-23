import { AuditLogService } from '@/admin/audit-log.service';
import { PrismaService } from '@/prisma/prisma.service';
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

  const mockPrismaService = {
    item: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    flaggedItem: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockAuditLogService = {
    log: jest.fn(),
  };

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
});

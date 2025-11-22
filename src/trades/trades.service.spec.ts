import { CacheService } from '@/cache/cache.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockItem, mockItems } from '@/test/fixtures/item.fixture';
import {
  mockAcceptedTrade,
  mockCancelledTrade,
  mockRejectedTrade,
  mockTrade,
  mockTradeWithRelations,
  mockTrades,
} from '@/test/fixtures/trade.fixture';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemStatus, TradeStatus } from '@prisma/client';
import { TradesService } from './trades.service';

// Mock NotificationsService
const mockNotificationsService = {
  createTradeNotification: jest.fn(),
  createNotification: jest.fn(),
  getUserNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  deleteNotification: jest.fn(),
};

// Mock CacheService
const mockCacheService = {
  get: jest.fn().mockResolvedValue(null), // Return null to bypass cache
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  delPattern: jest.fn().mockResolvedValue(0),
};

describe('TradesService', () => {
  let service: TradesService;
  let prisma: PrismaService;
  let notificationsService: NotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TradesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotificationsService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<TradesService>(TradesService);
    prisma = module.get<PrismaService>(PrismaService);
    notificationsService =
      module.get<NotificationsService>(NotificationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createTrade', () => {
    it('should create a trade successfully', async () => {
      const proposerId = 'user-123';
      const createTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
        message: 'Would love to trade!',
      };

      const itemOffered = {
        ...mockItem,
        id: 'item-123',
        userId: proposerId,
        status: ItemStatus.AVAILABLE,
        user: { id: proposerId },
      };

      const itemRequested = {
        ...mockItems[1],
        id: 'item-456',
        userId: 'user-456',
        status: ItemStatus.AVAILABLE,
        user: { id: 'user-456' },
      };

      mockPrismaService.item.findUnique
        .mockResolvedValueOnce(itemOffered)
        .mockResolvedValueOnce(itemRequested);

      mockPrismaService.trade.findFirst.mockResolvedValue(null);
      mockPrismaService.trade.create.mockResolvedValue(mockTradeWithRelations);

      const result = await service.createTrade(proposerId, createTradeDto);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe(TradeStatus.PENDING);
      expect(prisma.trade.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            proposerId,
            itemOfferedId: createTradeDto.itemOfferedId,
            itemRequestedId: createTradeDto.itemRequestedId,
            message: createTradeDto.message,
            status: TradeStatus.PENDING,
          }),
        }),
      );

      // Verify notification was sent to responder
      expect(notificationsService.createTradeNotification).toHaveBeenCalledWith(
        'TRADE_PROPOSAL',
        'user-456',
        mockTradeWithRelations,
      );
    });

    it('should throw NotFoundException when offered item not found', async () => {
      const proposerId = 'user-123';
      const createTradeDto = {
        itemOfferedId: 'non-existent',
        itemRequestedId: 'item-456',
      };

      mockPrismaService.item.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(mockItems[1]);

      await expect(
        service.createTrade(proposerId, createTradeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when requested item not found', async () => {
      const proposerId = 'user-123';
      const createTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'non-existent',
      };

      mockPrismaService.item.findUnique
        .mockResolvedValueOnce({
          ...mockItem,
          userId: proposerId,
          user: { id: proposerId },
        })
        .mockResolvedValueOnce(null);

      await expect(
        service.createTrade(proposerId, createTradeDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when proposer does not own offered item', async () => {
      const proposerId = 'user-123';
      const createTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
      };

      const itemOffered = {
        ...mockItem,
        userId: 'different-user',
        user: { id: 'different-user' },
      };

      mockPrismaService.item.findUnique
        .mockResolvedValueOnce(itemOffered)
        .mockResolvedValueOnce(mockItems[1]);

      await expect(
        service.createTrade(proposerId, createTradeDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException when trying to trade with yourself', async () => {
      const proposerId = 'user-123';
      const createTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
      };

      const itemOffered = {
        ...mockItem,
        userId: proposerId,
        user: { id: proposerId },
      };

      const itemRequested = {
        ...mockItems[1],
        userId: proposerId,
        user: { id: proposerId },
      };

      mockPrismaService.item.findUnique
        .mockResolvedValueOnce(itemOffered)
        .mockResolvedValueOnce(itemRequested);

      await expect(
        service.createTrade(proposerId, createTradeDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when offered item is not available', async () => {
      const proposerId = 'user-123';
      const createTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
      };

      const itemOffered = {
        ...mockItem,
        userId: proposerId,
        status: ItemStatus.TRADED,
        user: { id: proposerId },
      };

      mockPrismaService.item.findUnique
        .mockResolvedValueOnce(itemOffered)
        .mockResolvedValueOnce({
          ...mockItems[1],
          userId: 'user-456',
          user: { id: 'user-456' },
        });

      await expect(
        service.createTrade(proposerId, createTradeDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for duplicate pending trade', async () => {
      const proposerId = 'user-123';
      const createTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
      };

      mockPrismaService.item.findUnique
        .mockResolvedValueOnce({
          ...mockItem,
          userId: proposerId,
          user: { id: proposerId },
        })
        .mockResolvedValueOnce({
          ...mockItems[1],
          userId: 'user-456',
          user: { id: 'user-456' },
        });

      mockPrismaService.trade.findFirst.mockResolvedValue(mockTrade);

      await expect(
        service.createTrade(proposerId, createTradeDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserTrades', () => {
    it('should return all trades for a user', async () => {
      const userId = 'user-123';

      mockPrismaService.trade.findMany.mockResolvedValue(mockTrades);

      const result = await service.getUserTrades(userId);

      expect(result).toHaveLength(mockTrades.length);
      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [{ proposerId: userId }, { responderId: userId }],
          },
        }),
      );
    });

    it('should return empty array when user has no trades', async () => {
      const userId = 'user-123';

      mockPrismaService.trade.findMany.mockResolvedValue([]);

      const result = await service.getUserTrades(userId);

      expect(result).toEqual([]);
    });
  });

  describe('getTradeById', () => {
    it('should return trade when user is proposer', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123';

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      const result = await service.getTradeById(tradeId, userId);

      expect(result).toHaveProperty('id', tradeId);
      expect(prisma.trade.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tradeId },
        }),
      );
    });

    it('should return trade when user is responder', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456';

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      const result = await service.getTradeById(tradeId, userId);

      expect(result).toHaveProperty('id', tradeId);
    });

    it('should throw NotFoundException when trade not found', async () => {
      const tradeId = 'non-existent';
      const userId = 'user-123';

      mockPrismaService.trade.findUnique.mockResolvedValue(null);

      await expect(service.getTradeById(tradeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not part of trade', async () => {
      const tradeId = 'trade-123';
      const userId = 'different-user';

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      await expect(service.getTradeById(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('acceptTrade', () => {
    it('should accept trade and mark items as traded', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456'; // responder

      const trade = {
        ...mockTradeWithRelations,
        itemOffered: {
          ...mockTradeWithRelations.itemOffered,
          status: ItemStatus.AVAILABLE,
        },
        itemRequested: {
          ...mockTradeWithRelations.itemRequested,
          status: ItemStatus.AVAILABLE,
        },
      };

      mockPrismaService.trade.findUnique.mockResolvedValue(trade);
      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockPrismaService);
      });
      mockPrismaService.trade.update.mockResolvedValue(mockAcceptedTrade);
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.acceptTrade(tradeId, userId);

      expect(result.status).toBe(TradeStatus.ACCEPTED);
      expect(result.completedAt).toBeDefined();
      expect(prisma.trade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tradeId },
          data: expect.objectContaining({
            status: TradeStatus.ACCEPTED,
            completedAt: expect.any(Date),
          }),
        }),
      );

      // Verify notification was sent to proposer
      expect(notificationsService.createTradeNotification).toHaveBeenCalledWith(
        'TRADE_ACCEPTED',
        trade.proposerId,
        mockAcceptedTrade,
      );
    });

    it('should throw NotFoundException when trade not found', async () => {
      const tradeId = 'non-existent';
      const userId = 'user-456';

      mockPrismaService.trade.findUnique.mockResolvedValue(null);

      await expect(service.acceptTrade(tradeId, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException when user is not responder', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123'; // proposer, not responder

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      await expect(service.acceptTrade(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when trade is not pending', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456';

      mockPrismaService.trade.findUnique.mockResolvedValue(mockAcceptedTrade);

      await expect(service.acceptTrade(tradeId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectTrade', () => {
    it('should reject trade successfully', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456'; // responder

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );
      mockPrismaService.trade.update.mockResolvedValue(mockRejectedTrade);

      const result = await service.rejectTrade(tradeId, userId);

      expect(result.status).toBe(TradeStatus.REJECTED);
      expect(prisma.trade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tradeId },
          data: { status: TradeStatus.REJECTED },
        }),
      );

      // Verify notification was sent to proposer
      expect(notificationsService.createTradeNotification).toHaveBeenCalledWith(
        'TRADE_REJECTED',
        mockTradeWithRelations.proposerId,
        mockRejectedTrade,
      );
    });

    it('should throw ForbiddenException when user is not responder', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123'; // proposer

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      await expect(service.rejectTrade(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('cancelTrade', () => {
    it('should cancel trade successfully', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123'; // proposer

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );
      mockPrismaService.trade.update.mockResolvedValue(mockCancelledTrade);

      const result = await service.cancelTrade(tradeId, userId);

      expect(result.status).toBe(TradeStatus.CANCELLED);
      expect(prisma.trade.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: tradeId },
          data: { status: TradeStatus.CANCELLED },
        }),
      );

      // Verify notification was sent to responder
      expect(notificationsService.createTradeNotification).toHaveBeenCalledWith(
        'TRADE_CANCELLED',
        mockTradeWithRelations.responderId,
        mockCancelledTrade,
      );
    });

    it('should throw ForbiddenException when user is not proposer', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456'; // responder

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      await expect(service.cancelTrade(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when trade is not pending', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123';

      mockPrismaService.trade.findUnique.mockResolvedValue(mockAcceptedTrade);

      await expect(service.cancelTrade(tradeId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});

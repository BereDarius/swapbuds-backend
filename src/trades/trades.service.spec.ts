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

  describe('getUserTradesFiltered', () => {
    it('should return filtered trades with pagination', async () => {
      const userId = 'user-123';
      const filters = {
        status: TradeStatus.PENDING,
        page: 1,
        limit: 10,
      };

      mockPrismaService.trade.count.mockResolvedValue(2);
      mockPrismaService.trade.findMany.mockResolvedValue(mockTrades);

      const result = await service.getUserTradesFiltered(userId, filters);

      expect(result.trades).toHaveLength(mockTrades.length);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(prisma.trade.count).toHaveBeenCalled();
      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should filter by date range', async () => {
      const userId = 'user-123';
      const filters = {
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        page: 1,
        limit: 20,
      };

      mockPrismaService.trade.count.mockResolvedValue(1);
      mockPrismaService.trade.findMany.mockResolvedValue([
        mockTradeWithRelations,
      ]);

      const result = await service.getUserTradesFiltered(userId, filters);

      expect(result.trades).toHaveLength(1);
      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        }),
      );
    });

    it('should filter by category', async () => {
      const userId = 'user-123';
      const filters = {
        category: 'Electronics',
        page: 1,
        limit: 20,
      };

      mockPrismaService.trade.count.mockResolvedValue(1);
      mockPrismaService.trade.findMany.mockResolvedValue([
        mockTradeWithRelations,
      ]);

      const result = await service.getUserTradesFiltered(userId, filters);

      expect(result.trades).toHaveLength(1);
      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.any(Array),
              }),
            ]),
          }),
        }),
      );
    });

    it('should search by item title', async () => {
      const userId = 'user-123';
      const filters = {
        search: 'laptop',
        page: 1,
        limit: 20,
      };

      mockPrismaService.trade.count.mockResolvedValue(1);
      mockPrismaService.trade.findMany.mockResolvedValue([
        mockTradeWithRelations,
      ]);

      const result = await service.getUserTradesFiltered(userId, filters);

      expect(result.trades).toHaveLength(1);
      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                OR: expect.any(Array),
              }),
            ]),
          }),
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const userId = 'user-123';
      const filters = {
        page: 2,
        limit: 5,
      };

      mockPrismaService.trade.count.mockResolvedValue(12);
      mockPrismaService.trade.findMany.mockResolvedValue(mockTrades);

      const result = await service.getUserTradesFiltered(userId, filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(12);
      expect(result.totalPages).toBe(3);
      expect(prisma.trade.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should return empty results when no trades match filters', async () => {
      const userId = 'user-123';
      const filters = {
        status: TradeStatus.CANCELLED,
        page: 1,
        limit: 20,
      };

      mockPrismaService.trade.count.mockResolvedValue(0);
      mockPrismaService.trade.findMany.mockResolvedValue([]);

      const result = await service.getUserTradesFiltered(userId, filters);

      expect(result.trades).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
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

  describe('createCounterOffer', () => {
    const mockCounterOffer = {
      id: 'counter-offer-123',
      status: 'PENDING',
      tradeId: 'trade-123',
      createdById: 'user-456',
      alternativeItemId: 'item-789',
      message: 'How about this item instead?',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null,
      createdBy: {
        id: 'user-456',
        username: 'john_doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      alternativeItem: {
        id: 'item-789',
        title: 'Alternative Item',
        description: 'A great alternative',
        condition: 'EXCELLENT',
        category: 'ELECTRONICS',
        images: [{ url: 'https://example.com/image.jpg' }],
      },
    };

    it('should create a counter-offer successfully', async () => {
      const userId = 'user-456'; // responder
      const tradeId = 'trade-123';
      const createDto = {
        alternativeItemId: 'item-789',
        message: 'How about this item instead?',
      };

      const mockAlternativeItem = {
        id: 'item-789',
        userId: 'user-456',
        title: 'Alternative Item',
        description: 'A great alternative',
        condition: 'EXCELLENT',
        category: 'ELECTRONICS',
        status: ItemStatus.AVAILABLE,
        images: [{ url: 'https://example.com/image.jpg', order: 0 }],
      };

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );
      mockPrismaService.item.findUnique.mockResolvedValue(mockAlternativeItem);
      mockPrismaService.counterOffer.create.mockResolvedValue(mockCounterOffer);

      const result = await service.createCounterOffer(
        userId,
        tradeId,
        createDto,
      );

      expect(result).toBeDefined();
      expect(result.alternativeItem.id).toBe('item-789');
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException if trade does not exist', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(null);

      await expect(
        service.createCounterOffer('user-123', 'trade-123', {
          alternativeItemId: 'item-789',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trade is not pending', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(mockAcceptedTrade);

      await expect(
        service.createCounterOffer('user-123', 'trade-123', {
          alternativeItemId: 'item-789',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if user is not part of trade', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      await expect(
        service.createCounterOffer('user-999', 'trade-123', {
          alternativeItemId: 'item-789',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if alternative item does not exist', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );
      mockPrismaService.item.findUnique.mockResolvedValue(null);

      await expect(
        service.createCounterOffer('user-456', 'trade-123', {
          alternativeItemId: 'item-789',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if alternative item not owned by user', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );
      mockPrismaService.item.findUnique.mockResolvedValue({
        ...mockItem,
        userId: 'other-user',
      });

      await expect(
        service.createCounterOffer('user-456', 'trade-123', {
          alternativeItemId: 'item-789',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if alternative item not available', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );
      mockPrismaService.item.findUnique.mockResolvedValue({
        ...mockItem,
        userId: 'user-456',
        status: ItemStatus.TRADED,
      });

      await expect(
        service.createCounterOffer('user-456', 'trade-123', {
          alternativeItemId: 'item-789',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptCounterOffer', () => {
    const mockCounterOfferWithTrade = {
      id: 'counter-offer-123',
      status: 'PENDING',
      tradeId: 'trade-123',
      createdById: 'user-456',
      alternativeItemId: 'item-789',
      message: 'How about this?',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null,
      trade: mockTradeWithRelations,
      createdBy: {
        id: 'user-456',
        username: 'john_doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      alternativeItem: {
        id: 'item-789',
        title: 'Alternative Item',
        description: 'A great alternative',
        condition: 'EXCELLENT',
        category: 'ELECTRONICS',
        images: [{ url: 'https://example.com/image.jpg', order: 0 }],
      },
    };

    it('should accept a counter-offer successfully', async () => {
      const userId = 'user-123'; // proposer (other party)
      const counterOfferId = 'counter-offer-123';

      mockPrismaService.counterOffer.findUnique
        .mockResolvedValueOnce(mockCounterOfferWithTrade)
        .mockResolvedValueOnce({
          ...mockCounterOfferWithTrade,
          status: 'ACCEPTED',
        });

      mockPrismaService.$transaction.mockImplementation(async (operations) => {
        return Promise.all(operations);
      });

      mockPrismaService.trade.update.mockResolvedValue(mockTrade);

      const result = await service.acceptCounterOffer(userId, counterOfferId);

      expect(result).toBeDefined();
      expect(mockPrismaService.$transaction).toHaveBeenCalled();
      expect(mockPrismaService.trade.update).toHaveBeenCalled();
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException if counter-offer does not exist', async () => {
      mockPrismaService.counterOffer.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptCounterOffer('user-123', 'counter-offer-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user created the counter-offer', async () => {
      mockPrismaService.counterOffer.findUnique.mockResolvedValue(
        mockCounterOfferWithTrade,
      );

      await expect(
        service.acceptCounterOffer('user-456', 'counter-offer-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if counter-offer not pending', async () => {
      mockPrismaService.counterOffer.findUnique.mockResolvedValue({
        ...mockCounterOfferWithTrade,
        status: 'ACCEPTED',
      });

      await expect(
        service.acceptCounterOffer('user-123', 'counter-offer-123'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if trade not pending', async () => {
      mockPrismaService.counterOffer.findUnique.mockResolvedValue({
        ...mockCounterOfferWithTrade,
        trade: mockAcceptedTrade,
      });

      await expect(
        service.acceptCounterOffer('user-123', 'counter-offer-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('rejectCounterOffer', () => {
    const mockCounterOfferWithTrade = {
      id: 'counter-offer-123',
      status: 'PENDING',
      tradeId: 'trade-123',
      createdById: 'user-456',
      alternativeItemId: 'item-789',
      message: 'How about this?',
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: null,
      trade: mockTradeWithRelations,
      createdBy: {
        id: 'user-456',
        username: 'john_doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      alternativeItem: {
        id: 'item-789',
        title: 'Alternative Item',
        description: 'A great alternative',
        condition: 'EXCELLENT',
        category: 'ELECTRONICS',
        images: [{ url: 'https://example.com/image.jpg', order: 0 }],
      },
    };

    it('should reject a counter-offer successfully', async () => {
      const userId = 'user-123'; // proposer (other party)
      const counterOfferId = 'counter-offer-123';

      mockPrismaService.counterOffer.findUnique.mockResolvedValue(
        mockCounterOfferWithTrade,
      );

      mockPrismaService.counterOffer.update.mockResolvedValue({
        ...mockCounterOfferWithTrade,
        status: 'REJECTED',
      });

      const result = await service.rejectCounterOffer(userId, counterOfferId);

      expect(result).toBeDefined();
      expect(mockPrismaService.counterOffer.update).toHaveBeenCalledWith({
        where: { id: counterOfferId },
        data: { status: 'REJECTED' },
        include: expect.any(Object),
      });
      expect(mockNotificationsService.createNotification).toHaveBeenCalled();
    });

    it('should throw NotFoundException if counter-offer does not exist', async () => {
      mockPrismaService.counterOffer.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectCounterOffer('user-123', 'counter-offer-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user created the counter-offer', async () => {
      mockPrismaService.counterOffer.findUnique.mockResolvedValue(
        mockCounterOfferWithTrade,
      );

      await expect(
        service.rejectCounterOffer('user-456', 'counter-offer-123'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if counter-offer not pending', async () => {
      mockPrismaService.counterOffer.findUnique.mockResolvedValue({
        ...mockCounterOfferWithTrade,
        status: 'REJECTED',
      });

      await expect(
        service.rejectCounterOffer('user-123', 'counter-offer-123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTradeCounterOffers', () => {
    const mockCounterOffers = [
      {
        id: 'counter-offer-1',
        status: 'PENDING',
        tradeId: 'trade-123',
        createdById: 'user-456',
        alternativeItemId: 'item-789',
        message: 'First offer',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        createdBy: {
          id: 'user-456',
          username: 'john_doe',
          avatarUrl: 'https://example.com/avatar.jpg',
        },
        alternativeItem: {
          id: 'item-789',
          title: 'Alternative Item 1',
          description: 'First alternative',
          condition: 'EXCELLENT',
          category: 'ELECTRONICS',
          images: [{ url: 'https://example.com/image1.jpg', order: 0 }],
        },
      },
      {
        id: 'counter-offer-2',
        status: 'REJECTED',
        tradeId: 'trade-123',
        createdById: 'user-123',
        alternativeItemId: 'item-999',
        message: 'Second offer',
        createdAt: new Date(),
        updatedAt: new Date(),
        expiresAt: null,
        createdBy: {
          id: 'user-123',
          username: 'jane_smith',
          avatarUrl: 'https://example.com/avatar2.jpg',
        },
        alternativeItem: {
          id: 'item-999',
          title: 'Alternative Item 2',
          description: 'Second alternative',
          condition: 'GOOD',
          category: 'BOOKS',
          images: [{ url: 'https://example.com/image2.jpg', order: 0 }],
        },
      },
    ];

    it('should get all counter-offers for a trade', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123';

      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );
      mockPrismaService.counterOffer.findMany.mockResolvedValue(
        mockCounterOffers,
      );

      const result = await service.getTradeCounterOffers(tradeId, userId);

      expect(result).toBeDefined();
      expect(result).toHaveLength(2);
      expect(mockPrismaService.counterOffer.findMany).toHaveBeenCalledWith({
        where: { tradeId },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException if trade does not exist', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(null);

      await expect(
        service.getTradeCounterOffers('trade-123', 'user-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user not part of trade', async () => {
      mockPrismaService.trade.findUnique.mockResolvedValue(
        mockTradeWithRelations,
      );

      await expect(
        service.getTradeCounterOffers('trade-123', 'user-999'),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});

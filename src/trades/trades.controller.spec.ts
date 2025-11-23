import {
  mockTradeWithRelations,
  mockTrades,
} from '@/test/fixtures/trade.fixture';
import { TradesController } from '@/trades/trades.controller';
import { TradesService } from '@/trades/trades.service';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryMethod, TradeStatus } from '@prisma/client';
import { CreateTradeDto } from './dto/create-trade.dto';

describe('TradesController', () => {
  let controller: TradesController;
  let tradesService: TradesService;

  const mockTradesService = {
    createTrade: jest.fn(),
    getUserTrades: jest.fn(),
    getUserTradesFiltered: jest.fn(),
    getTradeById: jest.fn(),
    acceptTrade: jest.fn(),
    rejectTrade: jest.fn(),
    cancelTrade: jest.fn(),
    createCounterOffer: jest.fn(),
    getTradeCounterOffers: jest.fn(),
    acceptCounterOffer: jest.fn(),
    rejectCounterOffer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TradesController],
      providers: [
        {
          provide: TradesService,
          useValue: mockTradesService,
        },
      ],
    }).compile();

    controller = module.get<TradesController>(TradesController);
    tradesService = module.get<TradesService>(TradesService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createTrade', () => {
    it('should create a trade successfully', async () => {
      const userId = 'user-123';
      const createTradeDto: CreateTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
        deliveryMethod: DeliveryMethod.PHYSICAL,
        message: 'Would love to trade!',
      };

      mockTradesService.createTrade.mockResolvedValue(mockTradeWithRelations);

      const result = await controller.createTrade(userId, createTradeDto);

      expect(result).toEqual(mockTradeWithRelations);
      expect(tradesService.createTrade).toHaveBeenCalledWith(
        userId,
        createTradeDto,
      );
      expect(tradesService.createTrade).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      const userId = 'user-123';
      const createTradeDto: CreateTradeDto = {
        itemOfferedId: 'non-existent',
        itemRequestedId: 'item-456',
        deliveryMethod: DeliveryMethod.PHYSICAL,
      };

      mockTradesService.createTrade.mockRejectedValue(
        new NotFoundException('Item offered not found'),
      );

      await expect(
        controller.createTrade(userId, createTradeDto),
      ).rejects.toThrow(NotFoundException);
      expect(tradesService.createTrade).toHaveBeenCalledWith(
        userId,
        createTradeDto,
      );
    });

    it('should throw ForbiddenException when not owner of offered item', async () => {
      const userId = 'user-123';
      const createTradeDto: CreateTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
        deliveryMethod: DeliveryMethod.PHYSICAL,
      };

      mockTradesService.createTrade.mockRejectedValue(
        new ForbiddenException('You can only trade your own items'),
      );

      await expect(
        controller.createTrade(userId, createTradeDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException for self-trading', async () => {
      const userId = 'user-123';
      const createTradeDto: CreateTradeDto = {
        itemOfferedId: 'item-123',
        itemRequestedId: 'item-456',
        deliveryMethod: DeliveryMethod.PHYSICAL,
      };

      mockTradesService.createTrade.mockRejectedValue(
        new BadRequestException('Cannot trade with yourself'),
      );

      await expect(
        controller.createTrade(userId, createTradeDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyTrades', () => {
    it('should return all trades for user', async () => {
      const userId = 'user-123';
      const filters = {};

      mockTradesService.getUserTrades.mockResolvedValue(mockTrades);

      const result = await controller.getMyTrades(userId, filters);

      expect(result).toEqual({ trades: mockTrades, total: mockTrades.length });
      expect(tradesService.getUserTrades).toHaveBeenCalledWith(userId);
      expect(tradesService.getUserTrades).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when no trades', async () => {
      const userId = 'user-123';
      const filters = {};

      mockTradesService.getUserTrades.mockResolvedValue([]);

      const result = await controller.getMyTrades(userId, filters);

      expect(result).toEqual({ trades: [], total: 0 });
      expect(tradesService.getUserTrades).toHaveBeenCalledWith(userId);
    });

    it('should use filtered method when filters provided', async () => {
      const userId = 'user-123';
      const filters = { status: 'PENDING', page: 1, limit: 10 };
      const filteredResult = {
        trades: mockTrades,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };

      mockTradesService.getUserTradesFiltered.mockResolvedValue(filteredResult);

      const result = await controller.getMyTrades(userId, filters as any);

      expect(result).toEqual(filteredResult);
      expect(tradesService.getUserTradesFiltered).toHaveBeenCalledWith(
        userId,
        filters,
      );
    });
  });

  describe('getTradeById', () => {
    it('should return trade details', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123';

      mockTradesService.getTradeById.mockResolvedValue(mockTradeWithRelations);

      const result = await controller.getTradeById(tradeId, userId);

      expect(result).toEqual(mockTradeWithRelations);
      expect(tradesService.getTradeById).toHaveBeenCalledWith(tradeId, userId);
      expect(tradesService.getTradeById).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when trade not found', async () => {
      const tradeId = 'non-existent';
      const userId = 'user-123';

      mockTradesService.getTradeById.mockRejectedValue(
        new NotFoundException('Trade not found'),
      );

      await expect(controller.getTradeById(tradeId, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(tradesService.getTradeById).toHaveBeenCalledWith(tradeId, userId);
    });

    it('should throw ForbiddenException when not part of trade', async () => {
      const tradeId = 'trade-123';
      const userId = 'different-user';

      mockTradesService.getTradeById.mockRejectedValue(
        new ForbiddenException('You are not part of this trade'),
      );

      await expect(controller.getTradeById(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('acceptTrade', () => {
    it('should accept trade successfully', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456'; // responder

      const acceptedTrade = {
        ...mockTradeWithRelations,
        status: TradeStatus.ACCEPTED,
        completedAt: new Date(),
      };

      mockTradesService.acceptTrade.mockResolvedValue(acceptedTrade);

      const result = await controller.acceptTrade(tradeId, userId);

      expect(result).toEqual(acceptedTrade);
      expect(result.status).toBe(TradeStatus.ACCEPTED);
      expect(tradesService.acceptTrade).toHaveBeenCalledWith(tradeId, userId);
      expect(tradesService.acceptTrade).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when not responder', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123'; // proposer

      mockTradesService.acceptTrade.mockRejectedValue(
        new ForbiddenException('Only the responder can accept this trade'),
      );

      await expect(controller.acceptTrade(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when trade not pending', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456';

      mockTradesService.acceptTrade.mockRejectedValue(
        new BadRequestException('This trade is no longer pending'),
      );

      await expect(controller.acceptTrade(tradeId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('rejectTrade', () => {
    it('should reject trade successfully', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456'; // responder

      const rejectedTrade = {
        ...mockTradeWithRelations,
        status: TradeStatus.REJECTED,
      };

      mockTradesService.rejectTrade.mockResolvedValue(rejectedTrade);

      const result = await controller.rejectTrade(tradeId, userId);

      expect(result).toEqual(rejectedTrade);
      expect(result.status).toBe(TradeStatus.REJECTED);
      expect(tradesService.rejectTrade).toHaveBeenCalledWith(tradeId, userId);
      expect(tradesService.rejectTrade).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when not responder', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123'; // proposer

      mockTradesService.rejectTrade.mockRejectedValue(
        new ForbiddenException('Only the responder can reject this trade'),
      );

      await expect(controller.rejectTrade(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when trade not pending', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456';

      mockTradesService.rejectTrade.mockRejectedValue(
        new BadRequestException('This trade is no longer pending'),
      );

      await expect(controller.rejectTrade(tradeId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('cancelTrade', () => {
    it('should cancel trade successfully', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123'; // proposer

      const cancelledTrade = {
        ...mockTradeWithRelations,
        status: TradeStatus.CANCELLED,
      };

      mockTradesService.cancelTrade.mockResolvedValue(cancelledTrade);

      const result = await controller.cancelTrade(tradeId, userId);

      expect(result).toEqual(cancelledTrade);
      expect(result.status).toBe(TradeStatus.CANCELLED);
      expect(tradesService.cancelTrade).toHaveBeenCalledWith(tradeId, userId);
      expect(tradesService.cancelTrade).toHaveBeenCalledTimes(1);
    });

    it('should throw ForbiddenException when not proposer', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-456'; // responder

      mockTradesService.cancelTrade.mockRejectedValue(
        new ForbiddenException('Only the proposer can cancel this trade'),
      );

      await expect(controller.cancelTrade(tradeId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException when trade not pending', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123';

      mockTradesService.cancelTrade.mockRejectedValue(
        new BadRequestException('This trade is no longer pending'),
      );

      await expect(controller.cancelTrade(tradeId, userId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('createCounterOffer', () => {
    it('should create counter-offer successfully', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123';
      const createDto = {
        itemOfferedId: 'item-789',
        message: 'How about this instead?',
        alternativeItemId: 'item-101',
      };
      const mockCounterOffer = {
        id: 'counter-123',
        tradeId,
        proposerId: userId,
        itemOfferedId: createDto.itemOfferedId,
        message: createDto.message,
        status: TradeStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTradesService.createCounterOffer.mockResolvedValue(mockCounterOffer);

      const result = await controller.createCounterOffer(
        tradeId,
        userId,
        createDto,
      );

      expect(result).toEqual(mockCounterOffer);
      expect(tradesService.createCounterOffer).toHaveBeenCalledWith(
        userId,
        tradeId,
        createDto,
      );
    });
  });

  describe('getTradeCounterOffers', () => {
    it('should return all counter-offers for a trade', async () => {
      const tradeId = 'trade-123';
      const userId = 'user-123';
      const mockCounterOffers = [
        {
          id: 'counter-1',
          tradeId,
          proposerId: userId,
          itemOfferedId: 'item-789',
          status: TradeStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockTradesService.getTradeCounterOffers.mockResolvedValue(
        mockCounterOffers,
      );

      const result = await controller.getTradeCounterOffers(tradeId, userId);

      expect(result).toEqual(mockCounterOffers);
      expect(tradesService.getTradeCounterOffers).toHaveBeenCalledWith(
        tradeId,
        userId,
      );
    });
  });

  describe('acceptCounterOffer', () => {
    it('should accept counter-offer successfully', async () => {
      const counterOfferId = 'counter-123';
      const userId = 'user-123';
      const mockCounterOffer = {
        id: counterOfferId,
        tradeId: 'trade-123',
        proposerId: 'user-456',
        itemOfferedId: 'item-789',
        status: TradeStatus.ACCEPTED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTradesService.acceptCounterOffer.mockResolvedValue(mockCounterOffer);

      const result = await controller.acceptCounterOffer(
        counterOfferId,
        userId,
      );

      expect(result).toEqual(mockCounterOffer);
      expect(tradesService.acceptCounterOffer).toHaveBeenCalledWith(
        userId,
        counterOfferId,
      );
    });
  });

  describe('rejectCounterOffer', () => {
    it('should reject counter-offer successfully', async () => {
      const counterOfferId = 'counter-123';
      const userId = 'user-123';
      const mockCounterOffer = {
        id: counterOfferId,
        tradeId: 'trade-123',
        proposerId: 'user-456',
        itemOfferedId: 'item-789',
        status: TradeStatus.REJECTED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockTradesService.rejectCounterOffer.mockResolvedValue(mockCounterOffer);

      const result = await controller.rejectCounterOffer(
        counterOfferId,
        userId,
      );

      expect(result).toEqual(mockCounterOffer);
      expect(tradesService.rejectCounterOffer).toHaveBeenCalledWith(
        userId,
        counterOfferId,
      );
    });
  });
});

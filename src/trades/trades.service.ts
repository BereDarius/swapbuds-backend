import { Cacheable, CacheInvalidate } from '@/cache/cache.module';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, NotificationType, TradeStatus } from '@prisma/client';
import { CounterOfferResponseDto } from './dto/counter-offer-response.dto';
import { CreateCounterOfferDto } from './dto/create-counter-offer.dto';
import { CreateTradeDto } from './dto/create-trade.dto';
import { TradeFilterDto } from './dto/trade-filter.dto';
import { TradeResponseDto } from './dto/trade-response.dto';
import { TradeExpirationService } from './trade-expiration.service';

/**
 * Service handling trade business logic
 * Manages trade proposals, acceptance, rejection, and cancellation
 */
@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    @Inject(forwardRef(() => TradeExpirationService))
    private readonly tradeExpirationService: TradeExpirationService,
  ) {}

  /**
   * Get standard include object for trade queries
   * Handles both legacy single-item and new multi-item trades
   */
  private getTradeInclude() {
    return {
      proposer: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      responder: {
        select: {
          id: true,
          username: true,
          avatarUrl: true,
        },
      },
      // Legacy single-item fields
      itemOffered: {
        select: {
          id: true,
          title: true,
          images: {
            select: { url: true },
            orderBy: { order: 'asc' as const },
            take: 1,
          },
        },
      },
      itemRequested: {
        select: {
          id: true,
          title: true,
          images: {
            select: { url: true },
            orderBy: { order: 'asc' as const },
            take: 1,
          },
        },
      },
      // Multi-item support
      tradeItems: {
        include: {
          item: {
            select: {
              id: true,
              title: true,
              images: {
                select: { url: true },
                orderBy: { order: 'asc' as const },
                take: 1,
              },
            },
          },
        },
        orderBy: { order: 'asc' as const },
      },
    };
  }

  /**
   * Create a new trade proposal
   * @param proposerId - ID of user proposing the trade
   * @param createTradeDto - Trade details
   * @returns Created trade
   */
  @CacheInvalidate((proposerId: string, dto: CreateTradeDto) => [
    `users:${proposerId}:trades:*`,
    `users:${dto.itemRequestedId || dto.itemsRequestedIds?.[0]}:trades:*`,
    `trades:*`,
  ])
  async createTrade(
    proposerId: string,
    createTradeDto: CreateTradeDto,
  ): Promise<TradeResponseDto> {
    const {
      itemOfferedId,
      itemRequestedId,
      itemsOfferedIds,
      itemsRequestedIds,
      message,
    } = createTradeDto;

    // Determine if single-item (legacy) or multi-item trade
    const isMultiItem =
      (itemsOfferedIds && itemsOfferedIds.length > 0) ||
      (itemsRequestedIds && itemsRequestedIds.length > 0);

    // Validate that either legacy OR new format is used, not both
    if (
      isMultiItem &&
      (itemOfferedId !== undefined || itemRequestedId !== undefined)
    ) {
      throw new BadRequestException(
        'Cannot mix legacy (itemOfferedId/itemRequestedId) and new (itemsOfferedIds/itemsRequestedIds) formats',
      );
    }

    // Validate that at least one format is provided
    if (!isMultiItem && (!itemOfferedId || !itemRequestedId)) {
      throw new BadRequestException(
        'Must provide either legacy fields (itemOfferedId, itemRequestedId) or new fields (itemsOfferedIds, itemsRequestedIds)',
      );
    }

    // Handle multi-item trades
    if (isMultiItem) {
      return this.createMultiItemTrade(
        proposerId,
        itemsOfferedIds || [],
        itemsRequestedIds || [],
        createTradeDto.deliveryMethod,
        message,
      );
    }

    // Handle legacy single-item trades (backward compatibility)
    return this.createSingleItemTrade(
      proposerId,
      itemOfferedId!,
      itemRequestedId!,
      createTradeDto.deliveryMethod,
      message,
    );
  }

  /**
   * Create a legacy single-item trade (backward compatibility)
   */
  private async createSingleItemTrade(
    proposerId: string,
    itemOfferedId: string,
    itemRequestedId: string,
    deliveryMethod: any,
    message?: string,
  ): Promise<TradeResponseDto> {
    // Validate items exist
    const [itemOffered, itemRequested] = await Promise.all([
      this.prisma.item.findUnique({
        where: { id: itemOfferedId },
        include: { user: true },
      }),
      this.prisma.item.findUnique({
        where: { id: itemRequestedId },
        include: { user: true },
      }),
    ]);

    if (!itemOffered) {
      throw new NotFoundException('Item offered not found');
    }

    if (!itemRequested) {
      throw new NotFoundException('Item requested not found');
    }

    // Validate proposer owns the offered item
    if (itemOffered.userId !== proposerId) {
      throw new ForbiddenException('You can only trade your own items');
    }

    // Validate not trading with yourself
    if (itemRequested.userId === proposerId) {
      throw new BadRequestException('Cannot trade with yourself');
    }

    // Validate items are available
    if (itemOffered.status !== ItemStatus.AVAILABLE) {
      throw new BadRequestException('Your item is not available for trading');
    }

    if (itemRequested.status !== ItemStatus.AVAILABLE) {
      throw new BadRequestException(
        'The requested item is not available for trading',
      );
    }

    // Validate delivery method
    if (!itemOffered.deliveryMethods.includes(deliveryMethod)) {
      throw new BadRequestException(
        `Your item does not support ${deliveryMethod} delivery method`,
      );
    }
    if (!itemRequested.deliveryMethods.includes(deliveryMethod)) {
      throw new BadRequestException(
        `The requested item does not support ${deliveryMethod} delivery method`,
      );
    }

    // Check for duplicate pending trades
    const existingTrade = await this.prisma.trade.findFirst({
      where: {
        proposerId,
        itemOfferedId,
        itemRequestedId,
        status: TradeStatus.PENDING,
      },
    });

    if (existingTrade) {
      throw new BadRequestException(
        'You already have a pending trade proposal for these items',
      );
    }

    // Create the trade
    const trade = await this.prisma.trade.create({
      data: {
        proposerId,
        responderId: itemRequested.userId,
        itemOfferedId,
        itemRequestedId,
        message,
        deliveryMethod,
        status: TradeStatus.PENDING,
        expiresAt: this.tradeExpirationService.calculateExpirationDate(),
      },
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        itemOffered: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        itemRequested: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    // Send notification to responder about new trade proposal
    await this.notificationsService.createTradeNotification(
      NotificationType.TRADE_PROPOSAL,
      trade.responderId,
      trade,
    );

    return this.formatTradeResponse(trade);
  }

  /**
   * Create a multi-item trade
   */
  private async createMultiItemTrade(
    proposerId: string,
    itemsOfferedIds: string[],
    itemsRequestedIds: string[],
    deliveryMethod: any,
    message?: string,
  ): Promise<TradeResponseDto> {
    // Validate at least one item on each side
    if (itemsOfferedIds.length === 0 || itemsRequestedIds.length === 0) {
      throw new BadRequestException(
        'Multi-item trades require at least one item on each side',
      );
    }

    // Fetch all items
    const allItemIds = [...itemsOfferedIds, ...itemsRequestedIds];
    const items = await this.prisma.item.findMany({
      where: { id: { in: allItemIds } },
      include: { user: true },
    });

    // Validate all items exist
    if (items.length !== allItemIds.length) {
      const foundIds = items.map((i) => i.id);
      const missingIds = allItemIds.filter((id) => !foundIds.includes(id));
      throw new NotFoundException(`Items not found: ${missingIds.join(', ')}`);
    }

    // Separate offered and requested items
    const itemsOffered = items.filter((i) => itemsOfferedIds.includes(i.id));
    const itemsRequested = items.filter((i) =>
      itemsRequestedIds.includes(i.id),
    );

    // Validate proposer owns all offered items
    const notOwnedItems = itemsOffered.filter((i) => i.userId !== proposerId);
    if (notOwnedItems.length > 0) {
      throw new ForbiddenException(
        `You don't own these items: ${notOwnedItems.map((i) => i.title).join(', ')}`,
      );
    }

    // Get responder ID from first requested item
    const responderId = itemsRequested[0].userId;

    // Validate all requested items belong to same user
    const differentOwners = itemsRequested.filter(
      (i) => i.userId !== responderId,
    );
    if (differentOwners.length > 0) {
      throw new BadRequestException(
        'All requested items must belong to the same user',
      );
    }

    // Validate not trading with yourself
    if (responderId === proposerId) {
      throw new BadRequestException('Cannot trade with yourself');
    }

    // Validate all items are available
    const unavailableOffered = itemsOffered.filter(
      (i) => i.status !== ItemStatus.AVAILABLE,
    );
    if (unavailableOffered.length > 0) {
      throw new BadRequestException(
        `These items you're offering are not available: ${unavailableOffered.map((i) => i.title).join(', ')}`,
      );
    }

    const unavailableRequested = itemsRequested.filter(
      (i) => i.status !== ItemStatus.AVAILABLE,
    );
    if (unavailableRequested.length > 0) {
      throw new BadRequestException(
        `These requested items are not available: ${unavailableRequested.map((i) => i.title).join(', ')}`,
      );
    }

    // Validate delivery method for all items
    const incompatibleOffered = itemsOffered.filter(
      (i) => !i.deliveryMethods.includes(deliveryMethod),
    );
    if (incompatibleOffered.length > 0) {
      throw new BadRequestException(
        `These items you're offering don't support ${deliveryMethod} delivery: ${incompatibleOffered.map((i) => i.title).join(', ')}`,
      );
    }

    const incompatibleRequested = itemsRequested.filter(
      (i) => !i.deliveryMethods.includes(deliveryMethod),
    );
    if (incompatibleRequested.length > 0) {
      throw new BadRequestException(
        `These requested items don't support ${deliveryMethod} delivery: ${incompatibleRequested.map((i) => i.title).join(', ')}`,
      );
    }

    // Create the trade with trade items
    const trade = await this.prisma.trade.create({
      data: {
        proposerId,
        responderId,
        message,
        deliveryMethod,
        status: TradeStatus.PENDING,
        expiresAt: this.tradeExpirationService.calculateExpirationDate(),
        tradeItems: {
          create: [
            ...itemsOfferedIds.map((itemId, index) => ({
              itemId,
              side: 'OFFERED' as const,
              order: index,
            })),
            ...itemsRequestedIds.map((itemId, index) => ({
              itemId,
              side: 'REQUESTED' as const,
              order: index,
            })),
          ],
        },
      },
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        tradeItems: {
          include: {
            item: {
              select: {
                id: true,
                title: true,
                images: {
                  select: { url: true },
                  orderBy: { order: 'asc' },
                  take: 1,
                },
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    // Send notification to responder about new trade proposal
    await this.notificationsService.createTradeNotification(
      NotificationType.TRADE_PROPOSAL,
      trade.responderId,
      trade,
    );

    return this.formatTradeResponse(trade);
  }

  /**
   * Get all trades for a user (proposed or received)
   * @param userId - User ID
   * @returns Array of trades
   */
  @Cacheable({
    ttl: 60000, // 1 minute
    keyGenerator: (userId: string) => `users:${userId}:trades:all`,
  })
  async getUserTrades(userId: string): Promise<TradeResponseDto[]> {
    const trades = await this.prisma.trade.findMany({
      where: {
        OR: [{ proposerId: userId }, { responderId: userId }],
      },
      include: this.getTradeInclude(),
      orderBy: { createdAt: 'desc' },
    });

    return trades.map((trade) => this.formatTradeResponse(trade));
  }

  /**
   * Get filtered and paginated trades for a user
   * @param userId - User ID
   * @param filters - Filter and pagination parameters
   */
  async getUserTradesFiltered(
    userId: string,
    filters: TradeFilterDto,
  ): Promise<{
    trades: TradeResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const {
      status,
      startDate,
      endDate,
      category,
      search,
      page = 1,
      limit = 20,
    } = filters;

    // Build where clause
    const where: any = {
      OR: [{ proposerId: userId }, { responderId: userId }],
    };

    // Add status filter
    if (status) {
      where.status = status;
    }

    // Add date range filter
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    // Add category or search filter (on items)
    if (category || search) {
      where.AND = [];

      if (category) {
        where.AND.push({
          OR: [{ itemOffered: { category } }, { itemRequested: { category } }],
        });
      }

      if (search) {
        where.AND.push({
          OR: [
            {
              itemOffered: { title: { contains: search, mode: 'insensitive' } },
            },
            {
              itemRequested: {
                title: { contains: search, mode: 'insensitive' },
              },
            },
          ],
        });
      }
    }

    // Get total count
    const total = await this.prisma.trade.count({ where });

    // Get paginated trades
    const skip = (page - 1) * limit;
    const trades = await this.prisma.trade.findMany({
      where,
      skip,
      take: limit,
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        itemOffered: {
          select: {
            id: true,
            title: true,
            category: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        itemRequested: {
          select: {
            id: true,
            title: true,
            category: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return {
      trades: trades.map((trade) => this.formatTradeResponse(trade)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get a single trade by ID
   * @param tradeId - Trade ID
   * @param userId - Current user ID (for authorization)
   * @returns Trade details
   */
  @Cacheable({
    ttl: 120000, // 2 minutes
    keyGenerator: (tradeId: string) => `trades:${tradeId}`,
  })
  async getTradeById(
    tradeId: string,
    userId: string,
  ): Promise<TradeResponseDto> {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        itemOffered: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        itemRequested: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    // Verify user is part of the trade
    if (trade.proposerId !== userId && trade.responderId !== userId) {
      throw new ForbiddenException('You are not part of this trade');
    }

    return this.formatTradeResponse(trade);
  }

  /**
   * Accept a trade proposal
   * @param tradeId - Trade ID
   * @param userId - User accepting (must be responder)
   * @returns Updated trade
   */
  @CacheInvalidate((tradeId: string) => [
    `trades:${tradeId}`,
    `users:*:trades:*`,
    `items:*`,
  ])
  async acceptTrade(
    tradeId: string,
    userId: string,
  ): Promise<TradeResponseDto> {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        itemOffered: true,
        itemRequested: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    // Only responder can accept
    if (trade.responderId !== userId) {
      throw new ForbiddenException('Only the responder can accept this trade');
    }

    // Must be in pending status
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException('This trade is no longer pending');
    }

    // Verify items are still available
    if (trade.itemOffered.status !== ItemStatus.AVAILABLE) {
      throw new BadRequestException('The offered item is no longer available');
    }

    if (trade.itemRequested.status !== ItemStatus.AVAILABLE) {
      throw new BadRequestException(
        'The requested item is no longer available',
      );
    }

    // Update trade status and mark items as traded
    const updatedTrade = await this.prisma.$transaction(async (tx) => {
      // Update trade status
      const updated = await tx.trade.update({
        where: { id: tradeId },
        data: {
          status: TradeStatus.ACCEPTED,
          completedAt: new Date(),
        },
        include: {
          proposer: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          responder: {
            select: {
              id: true,
              username: true,
              avatarUrl: true,
            },
          },
          itemOffered: {
            select: {
              id: true,
              title: true,
              images: {
                select: { url: true },
                orderBy: { order: 'asc' },
                take: 1,
              },
            },
          },
          itemRequested: {
            select: {
              id: true,
              title: true,
              images: {
                select: { url: true },
                orderBy: { order: 'asc' },
                take: 1,
              },
            },
          },
        },
      });

      // Mark items as traded
      await tx.item.updateMany({
        where: {
          id: {
            in: [trade.itemOfferedId, trade.itemRequestedId],
          },
        },
        data: {
          status: ItemStatus.TRADED,
        },
      });

      return updated;
    });

    // Notify proposer that trade was accepted
    await this.notificationsService.createTradeNotification(
      NotificationType.TRADE_ACCEPTED,
      trade.proposerId,
      updatedTrade,
    );

    return this.formatTradeResponse(updatedTrade);
  }

  /**
   * Reject a trade proposal
   * @param tradeId - Trade ID
   * @param userId - User rejecting (must be responder)
   * @returns Updated trade
   */
  @CacheInvalidate((tradeId: string) => [
    `trades:${tradeId}`,
    `users:*:trades:*`,
  ])
  async rejectTrade(
    tradeId: string,
    userId: string,
  ): Promise<TradeResponseDto> {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    // Only responder can reject
    if (trade.responderId !== userId) {
      throw new ForbiddenException('Only the responder can reject this trade');
    }

    // Must be in pending status
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException('This trade is no longer pending');
    }

    const updatedTrade = await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: TradeStatus.REJECTED,
      },
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        itemOffered: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        itemRequested: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    // Notify proposer that trade was rejected
    await this.notificationsService.createTradeNotification(
      NotificationType.TRADE_REJECTED,
      trade.proposerId,
      updatedTrade,
    );

    return this.formatTradeResponse(updatedTrade);
  }

  /**
   * Cancel a trade proposal
   * @param tradeId - Trade ID
   * @param userId - User cancelling (must be proposer)
   * @returns Updated trade
   */
  @CacheInvalidate((tradeId: string) => [
    `trades:${tradeId}`,
    `users:*:trades:*`,
  ])
  async cancelTrade(
    tradeId: string,
    userId: string,
  ): Promise<TradeResponseDto> {
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    // Only proposer can cancel
    if (trade.proposerId !== userId) {
      throw new ForbiddenException('Only the proposer can cancel this trade');
    }

    // Must be in pending status
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException('This trade is no longer pending');
    }

    const updatedTrade = await this.prisma.trade.update({
      where: { id: tradeId },
      data: {
        status: TradeStatus.CANCELLED,
      },
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        itemOffered: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
        itemRequested: {
          select: {
            id: true,
            title: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
              take: 1,
            },
          },
        },
      },
    });

    // Notify responder that trade was cancelled by proposer
    await this.notificationsService.createTradeNotification(
      NotificationType.TRADE_CANCELLED,
      trade.responderId,
      updatedTrade,
    );

    return this.formatTradeResponse(updatedTrade);
  }

  /**
   * Create a counter-offer for a trade
   * @param userId - ID of user creating counter-offer
   * @param tradeId - ID of trade to counter
   * @param createDto - Counter-offer details
   * @returns Created counter-offer
   */
  @CacheInvalidate((userId: string, tradeId: string) => [
    `trades:${tradeId}`,
    `users:${userId}:trades:*`,
  ])
  async createCounterOffer(
    userId: string,
    tradeId: string,
    createDto: CreateCounterOfferDto,
  ): Promise<CounterOfferResponseDto> {
    const { alternativeItemId, message } = createDto;

    // Validate trade exists and is pending
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
      include: {
        proposer: true,
        responder: true,
      },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException(
        'Cannot create counter-offers for non-pending trades',
      );
    }

    // Validate user is part of this trade
    if (trade.proposerId !== userId && trade.responderId !== userId) {
      throw new ForbiddenException(
        'You can only create counter-offers for your own trades',
      );
    }

    // Validate alternative item exists and is owned by user
    const alternativeItem = await this.prisma.item.findUnique({
      where: { id: alternativeItemId },
      include: {
        images: {
          select: { url: true },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!alternativeItem) {
      throw new NotFoundException('Alternative item not found');
    }

    if (alternativeItem.userId !== userId) {
      throw new ForbiddenException(
        'You can only offer your own items in counter-offers',
      );
    }

    // Validate alternative item is available
    if (alternativeItem.status !== ItemStatus.AVAILABLE) {
      throw new BadRequestException(
        'Alternative item is not available for trading',
      );
    }

    // Create counter-offer
    const counterOffer = await this.prisma.counterOffer.create({
      data: {
        tradeId,
        createdById: userId,
        alternativeItemId,
        message,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        alternativeItem: {
          select: {
            id: true,
            title: true,
            description: true,
            condition: true,
            category: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    // Notify the other party
    const otherUserId =
      userId === trade.proposerId ? trade.responderId : trade.proposerId;
    await this.notificationsService.createNotification({
      userId: otherUserId,
      type: NotificationType.TRADE_PROPOSAL,
      title: 'Counter-Offer Received',
      message: `${counterOffer.createdBy.username} sent a counter-offer for your trade`,
      metadata: { tradeId, counterOfferId: counterOffer.id },
    });

    return this.formatCounterOfferResponse(counterOffer);
  }

  /**
   * Accept a counter-offer
   * @param userId - ID of user accepting
   * @param counterOfferId - ID of counter-offer
   * @returns Updated counter-offer
   */
  @CacheInvalidate((userId: string) => [`trades:*`, `users:${userId}:trades:*`])
  async acceptCounterOffer(
    userId: string,
    counterOfferId: string,
  ): Promise<CounterOfferResponseDto> {
    // Find counter-offer with trade details
    const counterOffer = await this.prisma.counterOffer.findUnique({
      where: { id: counterOfferId },
      include: {
        trade: {
          include: {
            proposer: true,
            responder: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        alternativeItem: {
          include: {
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!counterOffer) {
      throw new NotFoundException('Counter-offer not found');
    }

    // Validate user is the other party (not the one who created counter-offer)
    const { trade } = counterOffer;
    const otherUserId =
      counterOffer.createdById === trade.proposerId
        ? trade.responderId
        : trade.proposerId;

    if (userId !== otherUserId) {
      throw new ForbiddenException(
        'Only the other party can accept this counter-offer',
      );
    }

    // Validate counter-offer is pending
    if (counterOffer.status !== 'PENDING') {
      throw new BadRequestException('This counter-offer is no longer pending');
    }

    // Validate trade is still pending
    if (trade.status !== TradeStatus.PENDING) {
      throw new BadRequestException('The trade is no longer pending');
    }

    // Update counter-offer status and reject other pending counter-offers
    await this.prisma.$transaction([
      this.prisma.counterOffer.update({
        where: { id: counterOfferId },
        data: { status: 'ACCEPTED' },
      }),
      this.prisma.counterOffer.updateMany({
        where: {
          tradeId: trade.id,
          id: { not: counterOfferId },
          status: 'PENDING',
        },
        data: { status: 'REJECTED' },
      }),
    ]);

    // Update trade to use the alternative item
    // If proposer created counter-offer, update itemOffered
    // If responder created counter-offer, update itemRequested
    const updateData =
      counterOffer.createdById === trade.proposerId
        ? { itemOfferedId: counterOffer.alternativeItemId }
        : { itemRequestedId: counterOffer.alternativeItemId };

    await this.prisma.trade.update({
      where: { id: trade.id },
      data: updateData,
    });

    // Notify counter-offer creator
    await this.notificationsService.createNotification({
      userId: counterOffer.createdById,
      type: NotificationType.TRADE_ACCEPTED,
      title: 'Counter-Offer Accepted',
      message: `Your counter-offer was accepted`,
      metadata: { tradeId: trade.id, counterOfferId },
    });

    // Fetch updated counter-offer
    const updated = await this.prisma.counterOffer.findUnique({
      where: { id: counterOfferId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        alternativeItem: {
          select: {
            id: true,
            title: true,
            description: true,
            condition: true,
            category: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    return this.formatCounterOfferResponse(updated!);
  }

  /**
   * Reject a counter-offer
   * @param userId - ID of user rejecting
   * @param counterOfferId - ID of counter-offer
   * @returns Updated counter-offer
   */
  @CacheInvalidate((userId: string) => [`trades:*`, `users:${userId}:trades:*`])
  async rejectCounterOffer(
    userId: string,
    counterOfferId: string,
  ): Promise<CounterOfferResponseDto> {
    // Find counter-offer with trade details
    const counterOffer = await this.prisma.counterOffer.findUnique({
      where: { id: counterOfferId },
      include: {
        trade: {
          include: {
            proposer: true,
            responder: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        alternativeItem: {
          include: {
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (!counterOffer) {
      throw new NotFoundException('Counter-offer not found');
    }

    // Validate user is the other party (not the one who created counter-offer)
    const { trade } = counterOffer;
    const otherUserId =
      counterOffer.createdById === trade.proposerId
        ? trade.responderId
        : trade.proposerId;

    if (userId !== otherUserId) {
      throw new ForbiddenException(
        'Only the other party can reject this counter-offer',
      );
    }

    // Validate counter-offer is pending
    if (counterOffer.status !== 'PENDING') {
      throw new BadRequestException('This counter-offer is no longer pending');
    }

    // Update counter-offer status
    const updated = await this.prisma.counterOffer.update({
      where: { id: counterOfferId },
      data: { status: 'REJECTED' },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        alternativeItem: {
          select: {
            id: true,
            title: true,
            description: true,
            condition: true,
            category: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    // Notify counter-offer creator
    await this.notificationsService.createNotification({
      userId: counterOffer.createdById,
      type: NotificationType.TRADE_REJECTED,
      title: 'Counter-Offer Rejected',
      message: `Your counter-offer was rejected`,
      metadata: { tradeId: trade.id, counterOfferId },
    });

    return this.formatCounterOfferResponse(updated);
  }

  /**
   * Get all counter-offers for a trade
   * @param tradeId - Trade ID
   * @param userId - User ID (for authorization)
   * @returns List of counter-offers
   */
  @Cacheable({
    keyGenerator: (tradeId: string) => `trades:${tradeId}:counter-offers`,
  })
  async getTradeCounterOffers(
    tradeId: string,
    userId: string,
  ): Promise<CounterOfferResponseDto[]> {
    // Validate trade exists and user is part of it
    const trade = await this.prisma.trade.findUnique({
      where: { id: tradeId },
    });

    if (!trade) {
      throw new NotFoundException('Trade not found');
    }

    if (trade.proposerId !== userId && trade.responderId !== userId) {
      throw new ForbiddenException(
        'You can only view counter-offers for your own trades',
      );
    }

    // Fetch counter-offers
    const counterOffers = await this.prisma.counterOffer.findMany({
      where: { tradeId },
      include: {
        createdBy: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        alternativeItem: {
          select: {
            id: true,
            title: true,
            description: true,
            condition: true,
            category: true,
            images: {
              select: { url: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return counterOffers.map((co) => this.formatCounterOfferResponse(co));
  }

  /**
   * Format trade response with proper structure
   */
  private formatTradeResponse(trade: any): TradeResponseDto {
    const isMultiItem = trade.tradeItems && trade.tradeItems.length > 0;

    // For multi-item trades
    if (isMultiItem) {
      const offeredItems = trade.tradeItems
        .filter((ti: any) => ti.side === 'OFFERED')
        .map((ti: any) => ({
          id: ti.item.id,
          title: ti.item.title,
          images: ti.item.images.map((img: any) => img.url),
        }));

      const requestedItems = trade.tradeItems
        .filter((ti: any) => ti.side === 'REQUESTED')
        .map((ti: any) => ({
          id: ti.item.id,
          title: ti.item.title,
          images: ti.item.images.map((img: any) => img.url),
        }));

      return {
        id: trade.id,
        status: trade.status,
        proposer: trade.proposer,
        responder: trade.responder,
        itemsOffered: offeredItems,
        itemsRequested: requestedItems,
        message: trade.message,
        createdAt: trade.createdAt,
        updatedAt: trade.updatedAt,
        completedAt: trade.completedAt,
        expiresAt: trade.expiresAt,
      };
    }

    // For legacy single-item trades
    return {
      id: trade.id,
      status: trade.status,
      proposer: trade.proposer,
      responder: trade.responder,
      itemOffered: {
        id: trade.itemOffered.id,
        title: trade.itemOffered.title,
        images: trade.itemOffered.images.map((img: any) => img.url),
      },
      itemRequested: {
        id: trade.itemRequested.id,
        title: trade.itemRequested.title,
        images: trade.itemRequested.images.map((img: any) => img.url),
      },
      message: trade.message,
      createdAt: trade.createdAt,
      updatedAt: trade.updatedAt,
      completedAt: trade.completedAt,
      expiresAt: trade.expiresAt,
    };
  }

  /**
   * Format counter-offer response with proper structure
   */
  private formatCounterOfferResponse(
    counterOffer: any,
  ): CounterOfferResponseDto {
    return {
      id: counterOffer.id,
      status: counterOffer.status,
      tradeId: counterOffer.tradeId,
      createdBy: counterOffer.createdBy,
      alternativeItem: {
        id: counterOffer.alternativeItem.id,
        title: counterOffer.alternativeItem.title,
        description: counterOffer.alternativeItem.description,
        condition: counterOffer.alternativeItem.condition,
        category: counterOffer.alternativeItem.category,
        images: counterOffer.alternativeItem.images.map((img: any) => img.url),
      },
      message: counterOffer.message,
      createdAt: counterOffer.createdAt,
      updatedAt: counterOffer.updatedAt,
      expiresAt: counterOffer.expiresAt,
    };
  }
}

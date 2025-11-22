import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ItemStatus, NotificationType, TradeStatus } from '@prisma/client';
import { CreateTradeDto } from './dto/create-trade.dto';
import { TradeResponseDto } from './dto/trade-response.dto';

/**
 * Service handling trade business logic
 * Manages trade proposals, acceptance, rejection, and cancellation
 */
@Injectable()
export class TradesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Create a new trade proposal
   * @param proposerId - ID of user proposing the trade
   * @param createTradeDto - Trade details
   * @returns Created trade
   */
  async createTrade(
    proposerId: string,
    createTradeDto: CreateTradeDto,
  ): Promise<TradeResponseDto> {
    const { itemOfferedId, itemRequestedId, message } = createTradeDto;

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
        status: TradeStatus.PENDING,
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
   * Get all trades for a user (proposed or received)
   * @param userId - User ID
   * @returns Array of trades
   */
  async getUserTrades(userId: string): Promise<TradeResponseDto[]> {
    const trades = await this.prisma.trade.findMany({
      where: {
        OR: [{ proposerId: userId }, { responderId: userId }],
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
      orderBy: { createdAt: 'desc' },
    });

    return trades.map((trade) => this.formatTradeResponse(trade));
  }

  /**
   * Get a single trade by ID
   * @param tradeId - Trade ID
   * @param userId - Current user ID (for authorization)
   * @returns Trade details
   */
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
   * Format trade response with proper structure
   */
  private formatTradeResponse(trade: any): TradeResponseDto {
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
    };
  }
}

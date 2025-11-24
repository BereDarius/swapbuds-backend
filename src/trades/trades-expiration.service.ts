import { MailService } from '@/mail/mail.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationType, TradeStatus } from '@prisma/client';

/**
 * Service for handling automatic trade expiration
 * Runs scheduled tasks to expire pending trades and send notifications
 */
@Injectable()
export class TradeExpirationService {
  private readonly logger = new Logger(TradeExpirationService.name);
  private readonly expirationHours: number;
  private readonly notificationHoursBefore: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {
    // Default: trades expire after 72 hours (3 days)
    this.expirationHours =
      this.configService.get<number>('TRADE_EXPIRATION_HOURS') || 72;

    // Default: send notification 24 hours before expiry
    this.notificationHoursBefore =
      this.configService.get<number>('TRADE_EXPIRATION_NOTIFICATION_HOURS') ||
      24;
  }

  /**
   * Run every hour to check for expired trades
   * Cron: At minute 0 of every hour
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleTradeExpiration() {
    this.logger.log('Running trade expiration check...');

    const now = new Date();

    // Find all pending trades that have expired
    const expiredTrades = await this.prisma.trade.findMany({
      where: {
        status: TradeStatus.PENDING,
        expiresAt: {
          lte: now,
        },
      },
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
          },
        },
        itemOffered: {
          select: {
            id: true,
            title: true,
          },
        },
        itemRequested: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (expiredTrades.length === 0) {
      this.logger.log('No expired trades found');
      return;
    }

    this.logger.log(`Found ${expiredTrades.length} expired trades`);

    // Expire each trade and send notifications
    for (const trade of expiredTrades) {
      try {
        // Update trade status to EXPIRED
        await this.prisma.trade.update({
          where: { id: trade.id },
          data: { status: TradeStatus.EXPIRED },
        });

        // Fetch proposer and responder with email addresses
        const [proposerWithEmail, responderWithEmail] = await Promise.all([
          this.prisma.user.findUnique({
            where: { id: trade.proposerId },
            select: { email: true },
          }),
          this.prisma.user.findUnique({
            where: { id: trade.responderId },
            select: { email: true },
          }),
        ]);

        // Notify both parties (in-app notifications)
        await Promise.all([
          this.notificationsService.createNotification({
            userId: trade.proposerId,
            type: NotificationType.TRADE_CANCELLED,
            title: 'Trade Expired',
            message: `Your trade proposal for "${trade.itemRequested.title}" has expired`,
            metadata: { tradeId: trade.id },
          }),
          this.notificationsService.createNotification({
            userId: trade.responderId,
            type: NotificationType.TRADE_CANCELLED,
            title: 'Trade Expired',
            message: `Trade proposal from ${trade.proposer.username} for "${trade.itemOffered.title}" has expired`,
            metadata: { tradeId: trade.id },
          }),
        ]);

        // Send email notifications to both parties
        await Promise.all([
          this.mailService.sendTradeExpired(
            proposerWithEmail.email,
            trade.proposer.username,
            {
              itemName: trade.itemRequested.title,
              otherPartyName: trade.responder.username,
              tradeId: trade.id,
              isProposer: true,
            },
          ),
          this.mailService.sendTradeExpired(
            responderWithEmail.email,
            trade.responder.username,
            {
              itemName: trade.itemOffered.title,
              otherPartyName: trade.proposer.username,
              tradeId: trade.id,
              isProposer: false,
            },
          ),
        ]);

        this.logger.log(`Expired trade ${trade.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to expire trade ${trade.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Trade expiration check completed. Expired ${expiredTrades.length} trades`,
    );
  }

  /**
   * Run every 6 hours to send expiration warnings
   * Cron: At minute 0 past every 6th hour
   */
  @Cron(CronExpression.EVERY_6_HOURS)
  async handleExpirationWarnings() {
    this.logger.log('Running expiration warning check...');

    const now = new Date();
    const warningTime = new Date(
      now.getTime() + this.notificationHoursBefore * 60 * 60 * 1000,
    );

    // Find trades expiring soon that haven't been notified
    const expiringTrades = await this.prisma.trade.findMany({
      where: {
        status: TradeStatus.PENDING,
        expiresAt: {
          gte: now,
          lte: warningTime,
        },
      },
      include: {
        proposer: {
          select: {
            id: true,
            username: true,
          },
        },
        responder: {
          select: {
            id: true,
            username: true,
          },
        },
        itemOffered: {
          select: {
            id: true,
            title: true,
          },
        },
        itemRequested: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (expiringTrades.length === 0) {
      this.logger.log('No trades expiring soon');
      return;
    }

    this.logger.log(
      `Found ${expiringTrades.length} trades expiring within ${this.notificationHoursBefore} hours`,
    );

    // Send warning notifications
    for (const trade of expiringTrades) {
      try {
        const hoursRemaining = Math.ceil(
          (trade.expiresAt!.getTime() - now.getTime()) / (1000 * 60 * 60),
        );

        // Fetch responder with email
        const responderWithEmail = await this.prisma.user.findUnique({
          where: { id: trade.responderId },
          select: { email: true },
        });

        // Notify responder (the one who needs to respond) - in-app notification
        await this.notificationsService.createNotification({
          userId: trade.responderId,
          type: NotificationType.TRADE_PROPOSAL,
          title: 'Trade Expiring Soon',
          message: `Trade proposal from ${trade.proposer.username} expires in ${hoursRemaining} hours`,
          metadata: { tradeId: trade.id, hoursRemaining },
        });

        // Send email warning to responder
        await this.mailService.sendTradeExpiringWarning(
          responderWithEmail.email,
          trade.responder.username,
          {
            proposerName: trade.proposer.username,
            offeredItemName: trade.itemOffered.title,
            requestedItemName: trade.itemRequested.title,
            hoursRemaining,
            tradeId: trade.id,
          },
        );

        this.logger.log(`Sent expiration warning for trade ${trade.id}`);
      } catch (error) {
        this.logger.error(
          `Failed to send warning for trade ${trade.id}: ${error.message}`,
        );
      }
    }

    this.logger.log(
      `Expiration warning check completed. Sent ${expiringTrades.length} warnings`,
    );
  }

  /**
   * Calculate expiration date for a new trade
   * @returns Date when trade should expire
   */
  calculateExpirationDate(): Date {
    const now = new Date();
    return new Date(now.getTime() + this.expirationHours * 60 * 60 * 1000);
  }

  /**
   * Get expiration configuration
   * @returns Configuration object
   */
  getExpirationConfig() {
    return {
      expirationHours: this.expirationHours,
      notificationHoursBefore: this.notificationHoursBefore,
    };
  }
}

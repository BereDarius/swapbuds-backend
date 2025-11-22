import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Service for sending emails
 * Handles email notifications for trades and other events
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly isEmailEnabled: boolean;

  constructor(
    private mailerService: MailerService,
    private configService: ConfigService,
  ) {
    this.isEmailEnabled =
      !!this.configService.get('MAIL_USER') &&
      !!this.configService.get('MAIL_PASSWORD');

    if (!this.isEmailEnabled) {
      this.logger.warn(
        'Email service disabled - MAIL_USER or MAIL_PASSWORD not configured',
      );
    }
  }

  /**
   * Send trade proposal notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   * @param tradeData - Trade details
   */
  async sendTradeProposal(
    userEmail: string,
    userName: string,
    tradeData: {
      proposerName: string;
      offeredItemName: string;
      requestedItemName: string;
      tradeId: string;
    },
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping trade proposal email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '🔔 New Trade Proposal - SwapBuds',
        template: './trade-proposal',
        context: {
          userName,
          proposerName: tradeData.proposerName,
          offeredItemName: tradeData.offeredItemName,
          requestedItemName: tradeData.requestedItemName,
          tradeUrl: `${this.configService.get('FRONTEND_URL')}/trades/${tradeData.tradeId}`,
        },
      });

      this.logger.log(`Trade proposal email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send trade proposal email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send trade acceptance notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   * @param tradeData - Trade details
   */
  async sendTradeAccepted(
    userEmail: string,
    userName: string,
    tradeData: {
      responderName: string;
      offeredItemName: string;
      requestedItemName: string;
      tradeId: string;
    },
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping trade accepted email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '✅ Trade Accepted - SwapBuds',
        template: './trade-accepted',
        context: {
          userName,
          responderName: tradeData.responderName,
          offeredItemName: tradeData.offeredItemName,
          requestedItemName: tradeData.requestedItemName,
          tradeUrl: `${this.configService.get('FRONTEND_URL')}/trades/${tradeData.tradeId}`,
        },
      });

      this.logger.log(`Trade accepted email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send trade accepted email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send trade rejection notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   * @param tradeData - Trade details
   */
  async sendTradeRejected(
    userEmail: string,
    userName: string,
    tradeData: {
      responderName: string;
      offeredItemName: string;
      requestedItemName: string;
      tradeId: string;
    },
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping trade rejected email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '❌ Trade Rejected - SwapBuds',
        template: './trade-rejected',
        context: {
          userName,
          responderName: tradeData.responderName,
          offeredItemName: tradeData.offeredItemName,
          requestedItemName: tradeData.requestedItemName,
          tradeUrl: `${this.configService.get('FRONTEND_URL')}/trades/${tradeData.tradeId}`,
        },
      });

      this.logger.log(`Trade rejected email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send trade rejected email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send trade cancellation notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   * @param tradeData - Trade details
   */
  async sendTradeCancelled(
    userEmail: string,
    userName: string,
    tradeData: {
      proposerName: string;
      offeredItemName: string;
      requestedItemName: string;
      tradeId: string;
    },
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping trade cancelled email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '🚫 Trade Cancelled - SwapBuds',
        template: './trade-cancelled',
        context: {
          userName,
          proposerName: tradeData.proposerName,
          offeredItemName: tradeData.offeredItemName,
          requestedItemName: tradeData.requestedItemName,
          tradeUrl: `${this.configService.get('FRONTEND_URL')}/trades/${tradeData.tradeId}`,
        },
      });

      this.logger.log(`Trade cancelled email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send trade cancelled email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send welcome email to new user
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping welcome email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '👋 Welcome to SwapBuds!',
        template: './welcome',
        context: {
          userName,
          appUrl: this.configService.get('FRONTEND_URL'),
        },
      });

      this.logger.log(`Welcome email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send welcome email to ${userEmail}`,
        error.stack,
      );
    }
  }
}

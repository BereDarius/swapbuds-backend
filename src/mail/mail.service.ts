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
   * Send trade expiration notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   * @param tradeData - Trade details
   */
  async sendTradeExpired(
    userEmail: string,
    userName: string,
    tradeData: {
      itemName: string;
      otherPartyName?: string;
      tradeId: string;
      isProposer: boolean;
    },
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping trade expired email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '⏰ Trade Expired - SwapBuds',
        template: './trade-expired',
        context: {
          userName,
          itemName: tradeData.itemName,
          otherPartyName: tradeData.otherPartyName,
          isProposer: tradeData.isProposer,
          tradeUrl: `${this.configService.get('FRONTEND_URL')}/trades/${tradeData.tradeId}`,
        },
      });

      this.logger.log(`Trade expired email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send trade expired email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send trade expiration warning email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   * @param tradeData - Trade details
   */
  async sendTradeExpiringWarning(
    userEmail: string,
    userName: string,
    tradeData: {
      proposerName: string;
      offeredItemName: string;
      requestedItemName: string;
      hoursRemaining: number;
      tradeId: string;
    },
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug(
        'Email disabled, skipping trade expiring warning email',
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: `⏳ Trade Expiring in ${tradeData.hoursRemaining} Hours - SwapBuds`,
        template: './trade-expiring',
        context: {
          userName,
          proposerName: tradeData.proposerName,
          offeredItemName: tradeData.offeredItemName,
          requestedItemName: tradeData.requestedItemName,
          hoursRemaining: tradeData.hoursRemaining,
          tradeUrl: `${this.configService.get('FRONTEND_URL')}/trades/${tradeData.tradeId}`,
        },
      });

      this.logger.log(`Trade expiring warning email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send trade expiring warning email to ${userEmail}`,
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

  /**
   * Send verification submitted confirmation email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   */
  async sendVerificationSubmitted(
    userEmail: string,
    userName: string,
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug(
        'Email disabled, skipping verification submitted email',
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '📋 Verification Submitted - SwapBuds',
        template: './verification-submitted',
        context: {
          userName,
          appUrl: this.configService.get('FRONTEND_URL'),
        },
      });

      this.logger.log(`Verification submitted email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification submitted email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send verification approved notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   */
  async sendVerificationApproved(
    userEmail: string,
    userName: string,
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping verification approved email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '✅ Verification Approved - SwapBuds',
        template: './verification-approved',
        context: {
          userName,
          appUrl: this.configService.get('FRONTEND_URL'),
        },
      });

      this.logger.log(`Verification approved email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification approved email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send verification rejected notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   * @param rejectionReason - Reason for rejection
   */
  async sendVerificationRejected(
    userEmail: string,
    userName: string,
    rejectionReason: string,
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug('Email disabled, skipping verification rejected email');
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '❌ Verification Rejected - SwapBuds',
        template: './verification-rejected',
        context: {
          userName,
          rejectionReason,
          appUrl: this.configService.get('FRONTEND_URL'),
        },
      });

      this.logger.log(`Verification rejected email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send verification rejected email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send account suspended (underage) notification email
   * @param userEmail - Recipient email
   * @param userName - Recipient name
   */
  async sendAccountSuspendedUnderage(
    userEmail: string,
    userName: string,
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug(
        'Email disabled, skipping account suspended underage email',
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: userEmail,
        subject: '🚫 Account Suspended - SwapBuds',
        template: './account-suspended-underage',
        context: {
          userName,
          supportEmail: this.configService.get('SUPPORT_EMAIL'),
        },
      });

      this.logger.log(`Account suspended underage email sent to ${userEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send account suspended underage email to ${userEmail}`,
        error.stack,
      );
    }
  }

  /**
   * Send admin alert for new verification submission
   * @param adminEmail - Admin email
   * @param adminName - Admin name
   * @param verificationData - Verification details
   */
  async sendAdminVerificationAlert(
    adminEmail: string,
    adminName: string,
    verificationData: {
      username: string;
      userId: string;
      verificationId: string;
    },
  ): Promise<void> {
    if (!this.isEmailEnabled) {
      this.logger.debug(
        'Email disabled, skipping admin verification alert email',
      );
      return;
    }

    try {
      await this.mailerService.sendMail({
        to: adminEmail,
        subject: '🔔 New Verification Submission - SwapBuds Admin',
        template: './admin-verification-alert',
        context: {
          adminName,
          username: verificationData.username,
          userId: verificationData.userId,
          verificationUrl: `${this.configService.get('FRONTEND_URL')}/admin/verifications/${verificationData.verificationId}`,
        },
      });

      this.logger.log(`Admin verification alert email sent to ${adminEmail}`);
    } catch (error) {
      this.logger.error(
        `Failed to send admin verification alert email to ${adminEmail}`,
        error.stack,
      );
    }
  }
}

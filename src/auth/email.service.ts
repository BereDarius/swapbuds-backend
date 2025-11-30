import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: Transporter;
  private readonly isEmailEnabled: boolean;

  constructor(private configService: ConfigService) {
    const mailHost = this.configService.get<string>('MAIL_HOST');
    const mailPort = this.configService.get<number>('MAIL_PORT');
    const mailUser = this.configService.get<string>('MAIL_USER');
    const mailPassword = this.configService.get<string>('MAIL_PASSWORD');

    // Check if email is configured
    this.isEmailEnabled = !!(mailHost && mailPort && mailUser && mailPassword);

    if (this.isEmailEnabled) {
      this.transporter = nodemailer.createTransport({
        host: mailHost,
        port: mailPort,
        secure: false, // true for 465, false for other ports
        auth: {
          user: mailUser,
          pass: mailPassword,
        },
      });

      this.logger.log('Email service initialized successfully');
    } else {
      this.logger.warn(
        'Email service not configured. Emails will be logged to console.',
      );
    }
  }

  /**
   * Send email verification link to user
   */
  async sendVerificationEmail(
    email: string,
    username: string,
    verificationToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const verificationUrl = `${frontendUrl}/verify-email?token=${verificationToken}`;

    const mailOptions = {
      from:
        this.configService.get<string>('MAIL_FROM') || 'noreply@swapbuds.com',
      to: email,
      subject: 'Verify Your SwapBuds Email Address',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to SwapBuds, ${username}!</h1>
            </div>
            <div class="content">
              <p>Hi ${username},</p>
              <p>Thank you for registering with SwapBuds! To complete your registration, please verify your email address by clicking the button below:</p>
              <div style="text-align: center;">
                <a href="${verificationUrl}" class="button">Verify Email Address</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
                ${verificationUrl}
              </p>
              <p><strong>This link will expire in 24 hours.</strong></p>
              <p>If you didn't create an account with SwapBuds, you can safely ignore this email.</p>
              <p>Happy trading!<br>The SwapBuds Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} SwapBuds. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Welcome to SwapBuds, ${username}!

        Thank you for registering! To complete your registration, please verify your email address by visiting:

        ${verificationUrl}

        This link will expire in 24 hours.

        If you didn't create an account with SwapBuds, you can safely ignore this email.

        Happy trading!
        The SwapBuds Team
      `,
    };

    try {
      if (this.isEmailEnabled) {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Verification email sent to ${email}`);
      } else {
        // Log to console in development
        this.logger.warn(
          `[DEV MODE] Verification email would be sent to ${email}`,
        );
        this.logger.warn(`[DEV MODE] Verification URL: ${verificationUrl}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send verification email to ${email}`, error);
      throw error;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    email: string,
    username: string,
    resetToken: string,
  ): Promise<void> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from:
        this.configService.get<string>('MAIL_FROM') || 'noreply@swapbuds.com',
      to: email,
      subject: 'Reset Your SwapBuds Password',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background-color: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
            .button { display: inline-block; padding: 12px 30px; background-color: #DC2626; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${username},</p>
              <p>We received a request to reset your SwapBuds password. Click the button below to create a new password:</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; background-color: #f0f0f0; padding: 10px; border-radius: 4px;">
                ${resetUrl}
              </p>
              <p><strong>This link will expire in 1 hour.</strong></p>
              <p>If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.</p>
              <p>Best regards,<br>The SwapBuds Team</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; ${new Date().getFullYear()} SwapBuds. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
        Password Reset Request

        Hi ${username},

        We received a request to reset your SwapBuds password. Visit this link to create a new password:

        ${resetUrl}

        This link will expire in 1 hour.

        If you didn't request a password reset, you can safely ignore this email.

        Best regards,
        The SwapBuds Team
      `,
    };

    try {
      if (this.isEmailEnabled) {
        await this.transporter.sendMail(mailOptions);
        this.logger.log(`Password reset email sent to ${email}`);
      } else {
        this.logger.warn(
          `[DEV MODE] Password reset email would be sent to ${email}`,
        );
        this.logger.warn(`[DEV MODE] Reset URL: ${resetUrl}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to send password reset email to ${email}`,
        error,
      );
      throw error;
    }
  }
}

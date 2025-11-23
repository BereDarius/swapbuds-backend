import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

/**
 * Interface for reCAPTCHA verification response from Google
 */
interface RecaptchaVerifyResponse {
  success: boolean;
  score: number;
  action: string;
  challenge_ts: string;
  hostname: string;
  'error-codes'?: string[];
}

/**
 * Result of reCAPTCHA verification
 */
export interface RecaptchaVerificationResult {
  success: boolean;
  score: number;
  action: string;
  reason?: string;
}

/**
 * Service for verifying Google reCAPTCHA v3 tokens
 *
 * Handles communication with Google's reCAPTCHA API to verify tokens
 * and validate user actions based on configurable score thresholds.
 */
@Injectable()
export class RecaptchaService {
  private readonly logger = new Logger(RecaptchaService.name);
  private readonly secretKey: string;
  private readonly verifyUrl: string;
  private readonly minScore: number;

  constructor(private configService: ConfigService) {
    this.secretKey = this.configService.get<string>('recaptcha.secretKey');
    this.verifyUrl = this.configService.get<string>('recaptcha.verifyUrl');
    this.minScore = this.configService.get<number>('recaptcha.minScore', 0.5);

    if (!this.secretKey) {
      this.logger.warn(
        'reCAPTCHA secret key not configured. Token verification will be skipped.',
      );
    }
  }

  /**
   * Verify a reCAPTCHA token with Google's API
   *
   * @param token - The reCAPTCHA token from the frontend
   * @param expectedAction - The expected action name (e.g., 'register', 'login')
   * @param ip - Optional IP address of the request
   * @returns Verification result with success status and score
   */
  async verifyToken(
    token: string,
    expectedAction: string,
    ip?: string,
  ): Promise<RecaptchaVerificationResult> {
    // If no secret key configured, skip verification but log warning
    if (!this.secretKey) {
      this.logger.warn(
        `reCAPTCHA verification skipped for action: ${expectedAction}`,
      );
      return {
        success: true,
        score: 1.0,
        action: expectedAction,
        reason: 'reCAPTCHA not configured',
      };
    }

    // If no token provided, allow but log
    if (!token) {
      this.logger.debug(
        `No reCAPTCHA token provided for action: ${expectedAction}`,
      );
      return {
        success: true,
        score: 0.5,
        action: expectedAction,
        reason: 'No token provided',
      };
    }

    try {
      // Call Google reCAPTCHA verify API
      const response = await axios.post<RecaptchaVerifyResponse>(
        this.verifyUrl,
        null,
        {
          params: {
            secret: this.secretKey,
            response: token,
            remoteip: ip,
          },
        },
      );

      const data = response.data;

      // Check if verification failed
      if (!data.success) {
        this.logger.warn(
          `reCAPTCHA verification failed for action: ${expectedAction}. Errors: ${data['error-codes']?.join(', ')}`,
        );
        return {
          success: false,
          score: 0,
          action: expectedAction,
          reason: `Verification failed: ${data['error-codes']?.join(', ')}`,
        };
      }

      // Check if action matches
      if (data.action !== expectedAction) {
        this.logger.warn(
          `reCAPTCHA action mismatch. Expected: ${expectedAction}, Got: ${data.action}`,
        );
        return {
          success: false,
          score: data.score,
          action: data.action,
          reason: `Action mismatch. Expected: ${expectedAction}, Got: ${data.action}`,
        };
      }

      // Check if score meets threshold
      if (data.score < this.minScore) {
        this.logger.warn(
          `reCAPTCHA score too low for action: ${expectedAction}. Score: ${data.score}, Threshold: ${this.minScore}`,
        );
        return {
          success: false,
          score: data.score,
          action: data.action,
          reason: `Score ${data.score} below threshold ${this.minScore}`,
        };
      }

      // Success
      this.logger.log(
        `reCAPTCHA verification successful for action: ${expectedAction}. Score: ${data.score}`,
      );
      return {
        success: true,
        score: data.score,
        action: data.action,
      };
    } catch (error) {
      this.logger.error(
        `Error verifying reCAPTCHA token for action: ${expectedAction}`,
        error.stack,
      );

      // In case of network errors, allow the action but log the error
      return {
        success: true,
        score: 0.5,
        action: expectedAction,
        reason: 'Verification error, allowed by default',
      };
    }
  }

  /**
   * Verify token with custom score threshold
   *
   * @param token - The reCAPTCHA token from the frontend
   * @param expectedAction - The expected action name
   * @param customMinScore - Custom minimum score for this action
   * @param ip - Optional IP address of the request
   * @returns Verification result with success status and score
   */
  async verifyTokenWithThreshold(
    token: string,
    expectedAction: string,
    customMinScore: number,
    ip?: string,
  ): Promise<RecaptchaVerificationResult> {
    const originalMinScore = this.minScore;
    (this as any).minScore = customMinScore; // Temporarily override

    const result = await this.verifyToken(token, expectedAction, ip);

    (this as any).minScore = originalMinScore; // Restore
    return result;
  }
}

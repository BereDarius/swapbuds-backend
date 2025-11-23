import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';

/**
 * Service for logging verification-related actions for audit trail
 * Tracks all document access, approvals, rejections, and security events
 */
@Injectable()
export class VerificationAuditService {
  private readonly logger = new Logger(VerificationAuditService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Log verification submission
   */
  async logSubmission(
    userId: string,
    verificationId: string,
    documentType: string,
  ): Promise<void> {
    this.logger.log(
      `User ${userId} submitted verification ${verificationId} with document type ${documentType}`,
    );
    // In production, consider storing in separate audit log table
  }

  /**
   * Log document access
   */
  async logDocumentAccess(
    adminId: string,
    verificationId: string,
    action: 'VIEW' | 'DOWNLOAD',
  ): Promise<void> {
    this.logger.log(
      `Admin ${adminId} performed ${action} on verification ${verificationId}`,
    );
    // Store in audit log for compliance
  }

  /**
   * Log verification approval
   */
  async logApproval(
    adminId: string,
    verificationId: string,
    userId: string,
    isOver18: boolean,
  ): Promise<void> {
    this.logger.log(
      `Admin ${adminId} approved verification ${verificationId} for user ${userId} (isOver18: ${isOver18})`,
    );
  }

  /**
   * Log verification rejection
   */
  async logRejection(
    adminId: string,
    verificationId: string,
    userId: string,
    reason: string,
    isUnderage: boolean = false,
  ): Promise<void> {
    const status = isUnderage ? 'UNDERAGE' : 'REJECTED';
    this.logger.warn(
      `Admin ${adminId} ${status} verification ${verificationId} for user ${userId}. Reason: ${reason}`,
    );
  }

  /**
   * Log account suspension due to underage
   */
  async logUnderageAccountSuspension(
    verificationId: string,
    userId: string,
    age: number,
  ): Promise<void> {
    this.logger.warn(
      `Account ${userId} automatically suspended - underage (${age} years old). Verification: ${verificationId}`,
    );
  }

  /**
   * Log verification cancellation
   */
  async logCancellation(userId: string, verificationId: string): Promise<void> {
    this.logger.log(`User ${userId} cancelled verification ${verificationId}`);
  }

  /**
   * Log suspicious activity
   */
  async logSuspiciousActivity(
    userId: string,
    verificationId: string,
    reason: string,
  ): Promise<void> {
    this.logger.error(
      `SUSPICIOUS ACTIVITY - User ${userId}, Verification ${verificationId}: ${reason}`,
    );
    // In production, send alert to admin/security team
  }

  /**
   * Log document deletion
   */
  async logDocumentDeletion(
    verificationId: string,
    reason: 'AUTO_DELETION_APPROVED' | 'AUTO_DELETION_REJECTED' | 'MANUAL',
    daysAfterReview: number,
  ): Promise<void> {
    this.logger.log(
      `Document deleted for verification ${verificationId}. Reason: ${reason}, Days after review: ${daysAfterReview}`,
    );
  }

  /**
   * Log rate limit violation
   */
  async logRateLimitViolation(
    userId: string,
    attemptCount: number,
  ): Promise<void> {
    this.logger.warn(
      `Rate limit violation - User ${userId} attempted ${attemptCount} verifications`,
    );
  }
}

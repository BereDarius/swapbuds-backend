import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VerificationStatus } from '@prisma/client';
import { DocumentSecurityService } from './document-security.service';
import { VerificationAuditService } from './verification-audit.service';

/**
 * Service for automatically deleting verification documents
 * Runs scheduled tasks to delete old documents for GDPR compliance
 */
@Injectable()
export class VerificationCleanupService {
  private readonly logger = new Logger(VerificationCleanupService.name);

  // Deletion policies (days after review)
  private readonly DELETE_AFTER_APPROVED = 30; // 30 days after approval
  private readonly DELETE_AFTER_REJECTED = 90; // 90 days after rejection
  private readonly DELETE_AFTER_UNDERAGE = 90; // 90 days after underage rejection

  constructor(
    private prisma: PrismaService,
    private documentSecurity: DocumentSecurityService,
    private auditService: VerificationAuditService,
  ) {}

  /**
   * Scheduled task: Delete old approved documents (runs daily at 2 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async deleteOldApprovedDocuments(): Promise<void> {
    this.logger.log('Starting cleanup of old approved documents...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.DELETE_AFTER_APPROVED);

    const verifications = await this.prisma.userVerification.findMany({
      where: {
        status: VerificationStatus.APPROVED,
        reviewedAt: {
          lte: cutoffDate,
        },
        documentUrl: {
          not: null,
        },
      },
    });

    let deletedCount = 0;
    for (const verification of verifications) {
      try {
        await this.deleteVerificationDocument(
          verification,
          'AUTO_DELETION_APPROVED',
        );
        deletedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to delete document for verification ${verification.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Cleanup complete. Deleted ${deletedCount} approved documents.`,
    );
  }

  /**
   * Scheduled task: Delete old rejected documents (runs daily at 3 AM)
   */
  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async deleteOldRejectedDocuments(): Promise<void> {
    this.logger.log('Starting cleanup of old rejected documents...');

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - this.DELETE_AFTER_REJECTED);

    const verifications = await this.prisma.userVerification.findMany({
      where: {
        status: {
          in: [VerificationStatus.REJECTED, VerificationStatus.UNDERAGE],
        },
        reviewedAt: {
          lte: cutoffDate,
        },
        documentUrl: {
          not: null,
        },
      },
    });

    let deletedCount = 0;
    for (const verification of verifications) {
      try {
        const reason =
          verification.status === VerificationStatus.UNDERAGE
            ? 'AUTO_DELETION_REJECTED'
            : 'AUTO_DELETION_REJECTED';
        await this.deleteVerificationDocument(verification, reason);
        deletedCount++;
      } catch (error) {
        this.logger.error(
          `Failed to delete document for verification ${verification.id}:`,
          error,
        );
      }
    }

    this.logger.log(
      `Cleanup complete. Deleted ${deletedCount} rejected documents.`,
    );
  }

  /**
   * Delete a verification document
   */
  private async deleteVerificationDocument(
    verification: any,
    reason: 'AUTO_DELETION_APPROVED' | 'AUTO_DELETION_REJECTED' | 'MANUAL',
  ): Promise<void> {
    // Decrypt URL to get actual Cloudinary URL
    const decryptedUrl = this.documentSecurity.decryptUrl(
      verification.documentUrl,
    );

    // Extract public ID
    const publicId = this.documentSecurity.extractPublicId(decryptedUrl);

    // Delete from Cloudinary
    if (publicId && this.documentSecurity.isCloudinaryUrl(decryptedUrl)) {
      await this.documentSecurity.deleteDocument(publicId);
    }

    // Calculate days after review
    const daysAfterReview = verification.reviewedAt
      ? Math.floor(
          (Date.now() - verification.reviewedAt.getTime()) /
            (1000 * 60 * 60 * 24),
        )
      : 0;

    // Update database - set documentUrl to null (soft delete reference)
    await this.prisma.userVerification.update({
      where: { id: verification.id },
      data: {
        documentUrl: null,
        notes: verification.notes
          ? `${verification.notes}\n\nDocument deleted: ${reason} (${daysAfterReview} days after review)`
          : `Document deleted: ${reason} (${daysAfterReview} days after review)`,
      },
    });

    // Log deletion
    await this.auditService.logDocumentDeletion(
      verification.id,
      reason,
      daysAfterReview,
    );
  }

  /**
   * Manual deletion (for GDPR requests)
   */
  async deleteDocumentManually(verificationId: string): Promise<void> {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification || !verification.documentUrl) {
      throw new Error('Verification not found or document already deleted');
    }

    await this.deleteVerificationDocument(verification, 'MANUAL');
    this.logger.log(
      `Manually deleted document for verification ${verificationId}`,
    );
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    pendingApprovedDeletion: number;
    pendingRejectedDeletion: number;
    totalPendingDeletion: number;
    policies: {
      approvedDays: number;
      rejectedDays: number;
      underageDays: number;
    };
  }> {
    const approvedCutoff = new Date();
    approvedCutoff.setDate(
      approvedCutoff.getDate() - this.DELETE_AFTER_APPROVED,
    );

    const rejectedCutoff = new Date();
    rejectedCutoff.setDate(
      rejectedCutoff.getDate() - this.DELETE_AFTER_REJECTED,
    );

    const pendingApproved = await this.prisma.userVerification.count({
      where: {
        status: VerificationStatus.APPROVED,
        reviewedAt: { lte: approvedCutoff },
        documentUrl: { not: null },
      },
    });

    const pendingRejected = await this.prisma.userVerification.count({
      where: {
        status: {
          in: [VerificationStatus.REJECTED, VerificationStatus.UNDERAGE],
        },
        reviewedAt: { lte: rejectedCutoff },
        documentUrl: { not: null },
      },
    });

    return {
      pendingApprovedDeletion: pendingApproved,
      pendingRejectedDeletion: pendingRejected,
      totalPendingDeletion: pendingApproved + pendingRejected,
      policies: {
        approvedDays: this.DELETE_AFTER_APPROVED,
        rejectedDays: this.DELETE_AFTER_REJECTED,
        underageDays: this.DELETE_AFTER_UNDERAGE,
      },
    };
  }
}

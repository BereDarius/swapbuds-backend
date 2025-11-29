import { MailService } from '@/mail/mail.service';
import { NotificationsService } from '@/notifications/notifications.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';
import { DocumentSecurityService } from './document-security.service';
import {
  ReviewVerificationDto,
  SubmitVerificationDto,
} from './dto/verification.dto';
import { VerificationAuditService } from './verification-audit.service';
import { VerificationRateLimitService } from './verification-rate-limit.service';

/**
 * Service for managing user ID verification
 * Handles verification submission, review, and age verification
 * Includes security features: encryption, rate limiting, audit logging
 */
@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private prisma: PrismaService,
    private documentSecurity: DocumentSecurityService,
    private auditService: VerificationAuditService,
    private rateLimitService: VerificationRateLimitService,
    private mailService: MailService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Submit a verification request
   * Users can only have one pending verification at a time
   * Includes rate limiting and document encryption
   */
  async submitVerification(userId: string, dto: SubmitVerificationDto) {
    // Check rate limit
    const rateLimit = await this.rateLimitService.checkRateLimit(userId);
    if (!rateLimit.canSubmit) {
      await this.auditService.logRateLimitViolation(
        userId,
        rateLimit.attemptsUsed,
      );
      throw new BadRequestException(rateLimit.message);
    }

    // Check if user already has a verification
    const existing = await this.prisma.userVerification.findUnique({
      where: { userId },
    });

    if (existing) {
      if (existing.status === VerificationStatus.PENDING) {
        throw new BadRequestException(
          'You already have a pending verification request',
        );
      }

      if (existing.status === VerificationStatus.APPROVED) {
        throw new BadRequestException('You are already verified');
      }

      // Allow resubmission if previous was rejected/cancelled
      // Delete the old one first
      await this.prisma.userVerification.delete({
        where: { userId },
      });
    }

    // Encrypt document URLs before storing
    const encryptedUrlFront = this.documentSecurity.encryptUrl(
      dto.documentUrlFront,
    );
    const encryptedUrlBack = dto.documentUrlBack
      ? this.documentSecurity.encryptUrl(dto.documentUrlBack)
      : undefined;
    const encryptedSelfieUrl = this.documentSecurity.encryptUrl(dto.selfieUrl);

    // Create new verification request
    const verification = await this.prisma.userVerification.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentUrlFront: encryptedUrlFront,
        documentUrlBack: encryptedUrlBack,
        selfieUrl: encryptedSelfieUrl,
        status: VerificationStatus.PENDING,
      },
    });

    // Log submission
    await this.auditService.logSubmission(
      userId,
      verification.id,
      dto.documentType,
    );

    // Send confirmation email and notify admins
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, username: true },
    });

    if (user) {
      try {
        await this.mailService.sendVerificationSubmitted(
          user.email,
          user.username,
        );

        // Notify admins of new verification submission
        await this.notificationsService.notifyAdminsOfVerificationSubmission(
          verification.id,
          userId,
          user.username,
        );
      } catch (error) {
        // Log error but don't fail the verification submission
        this.logger.error(
          'Failed to send verification emails',
          error instanceof Error ? error.stack : String(error),
        );
      }
    }

    return verification;
  }

  /**
   * Get user's verification status
   */
  async getVerificationStatus(userId: string) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        status: true,
        documentType: true,
        submittedAt: true,
        reviewedAt: true,
        rejectionReason: true,
        isOver18: true,
      },
    });

    if (!verification) {
      throw new NotFoundException('No verification request found');
    }

    return verification;
  }

  /**
   * Cancel a pending verification request
   */
  async cancelVerification(userId: string) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { userId },
    });

    if (!verification) {
      throw new NotFoundException('No verification request found');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        'Can only cancel pending verification requests',
      );
    }

    await this.prisma.userVerification.update({
      where: { userId },
      data: {
        status: VerificationStatus.CANCELLED,
      },
    });

    // Log cancellation
    await this.auditService.logCancellation(userId, verification.id);

    return { message: 'Verification request cancelled' };
  }

  /**
   * Admin: Get all pending verifications
   */
  async getPendingVerifications(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    const [verifications, total] = await Promise.all([
      this.prisma.userVerification.findMany({
        where: {
          status: VerificationStatus.PENDING,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              email: true,
              createdAt: true,
            },
          },
        },
        orderBy: {
          submittedAt: 'asc', // Oldest first (FIFO)
        },
        skip,
        take: limit,
      }),
      this.prisma.userVerification.count({
        where: {
          status: VerificationStatus.PENDING,
        },
      }),
    ]);

    // Decrypt document URLs for admin viewing
    const verificationsWithDecryptedUrls = verifications.map((v) => ({
      ...v,
      documentUrlFront: this.documentSecurity.decryptUrl(v.documentUrlFront),
      documentUrlBack: v.documentUrlBack
        ? this.documentSecurity.decryptUrl(v.documentUrlBack)
        : null,
      selfieUrl: this.documentSecurity.decryptUrl(v.selfieUrl),
    }));

    return {
      verifications: verificationsWithDecryptedUrls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Admin: Get specific verification by ID
   */
  async getVerificationById(verificationId: string) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id: verificationId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            createdAt: true,
            reputationScore: true,
          },
        },
      },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    // Decrypt document URLs for admin viewing
    return {
      ...verification,
      documentUrlFront: this.documentSecurity.decryptUrl(
        verification.documentUrlFront,
      ),
      documentUrlBack: verification.documentUrlBack
        ? this.documentSecurity.decryptUrl(verification.documentUrlBack)
        : null,
      selfieUrl: this.documentSecurity.decryptUrl(verification.selfieUrl),
    };
  }

  /**
   * Admin: Approve verification
   * Calculates age from dateOfBirth and auto-rejects if under 18
   */
  async approveVerification(
    verificationId: string,
    adminId: string,
    dto: ReviewVerificationDto,
  ) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        'Can only approve pending verification requests',
      );
    }

    if (!dto.dateOfBirth) {
      throw new BadRequestException('Date of birth is required for approval');
    }

    // Calculate age
    const birthDate = new Date(dto.dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    const isOver18 = age >= 18;

    // If under 18, auto-reject
    if (!isOver18) {
      await this.prisma.userVerification.update({
        where: { id: verificationId },
        data: {
          status: VerificationStatus.UNDERAGE,
          dateOfBirth: birthDate,
          isOver18: false,
          reviewedAt: new Date(),
          reviewedBy: adminId,
          rejectionReason:
            'You must be at least 18 years old to use this platform',
          notes: dto.notes,
        },
      });

      // Deactivate user account
      await this.prisma.user.update({
        where: { id: verification.userId },
        data: {
          isActive: false,
        },
      });

      // Log underage suspension
      await this.auditService.logUnderageAccountSuspension(
        verificationId,
        verification.userId,
        age,
      );

      await this.auditService.logRejection(
        adminId,
        verificationId,
        verification.userId,
        'User is under 18 years old',
        true,
      );

      // Send underage suspension email
      const user = await this.prisma.user.findUnique({
        where: { id: verification.userId },
        select: { email: true, username: true },
      });

      if (user) {
        await this.mailService.sendAccountSuspendedUnderage(
          user.email,
          user.username,
        );
      }

      throw new BadRequestException(
        'User is under 18 years old. Account has been suspended.',
      );
    }

    // Approve verification
    const updated = await this.prisma.userVerification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.APPROVED,
        dateOfBirth: birthDate,
        isOver18: true,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        notes: dto.notes,
      },
    });

    // Update user's verified status
    await this.prisma.user.update({
      where: { id: verification.userId },
      data: {
        isVerified: true,
      },
    });

    // Log approval
    await this.auditService.logApproval(
      adminId,
      verificationId,
      verification.userId,
      true,
    );

    // Send approval email
    const user = await this.prisma.user.findUnique({
      where: { id: verification.userId },
      select: { email: true, username: true },
    });

    if (user) {
      await this.mailService.sendVerificationApproved(
        user.email,
        user.username,
      );
    }

    return updated;
  }

  /**
   * Admin: Reject verification
   */
  async rejectVerification(
    verificationId: string,
    adminId: string,
    dto: ReviewVerificationDto,
  ) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    if (verification.status !== VerificationStatus.PENDING) {
      throw new BadRequestException(
        'Can only reject pending verification requests',
      );
    }

    if (!dto.rejectionReason) {
      throw new BadRequestException('Rejection reason is required');
    }

    const updated = await this.prisma.userVerification.update({
      where: { id: verificationId },
      data: {
        status: VerificationStatus.REJECTED,
        reviewedAt: new Date(),
        reviewedBy: adminId,
        rejectionReason: dto.rejectionReason,
        notes: dto.notes,
      },
    });

    // Log rejection
    await this.auditService.logRejection(
      adminId,
      verificationId,
      verification.userId,
      dto.rejectionReason,
      false,
    );

    // Send rejection email
    const user = await this.prisma.user.findUnique({
      where: { id: verification.userId },
      select: { email: true, username: true },
    });

    if (user) {
      await this.mailService.sendVerificationRejected(
        user.email,
        user.username,
        dto.rejectionReason,
      );
    }

    return updated;
  }

  /**
   * Update internal notes for a verification
   */
  async updateNotes(verificationId: string, notes: string) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    return this.prisma.userVerification.update({
      where: { id: verificationId },
      data: { notes },
    });
  }

  /**
   * Get verification statistics (admin dashboard)
   */
  async getVerificationStats() {
    const [
      totalPending,
      totalApproved,
      totalRejected,
      totalUnderage,
      totalCancelled,
    ] = await Promise.all([
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.PENDING },
      }),
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.APPROVED },
      }),
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.REJECTED },
      }),
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.UNDERAGE },
      }),
      this.prisma.userVerification.count({
        where: { status: VerificationStatus.CANCELLED },
      }),
    ]);

    return {
      pending: totalPending,
      approved: totalApproved,
      rejected: totalRejected,
      underage: totalUnderage,
      cancelled: totalCancelled,
      total:
        totalPending +
        totalApproved +
        totalRejected +
        totalUnderage +
        totalCancelled,
    };
  }

  /**
   * Admin: Get signed URLs for viewing documents (front and back)
   * URLs expire after 5 minutes for security
   */
  async getDocumentSignedUrl(
    verificationId: string,
    adminId: string,
    side: 'front' | 'back' = 'front',
  ): Promise<{ signedUrl: string; expiresIn: number }> {
    const verification = await this.prisma.userVerification.findUnique({
      where: { id: verificationId },
    });

    if (!verification) {
      throw new NotFoundException('Verification not found');
    }

    const documentUrl =
      side === 'front'
        ? verification.documentUrlFront
        : verification.documentUrlBack;

    if (!documentUrl) {
      throw new NotFoundException(
        `Document ${side} not found or already deleted`,
      );
    }

    // Decrypt document URL
    const decryptedUrl = this.documentSecurity.decryptUrl(documentUrl);

    // Extract public ID
    const publicId = this.documentSecurity.extractPublicId(decryptedUrl);

    if (!publicId) {
      throw new BadRequestException('Invalid document URL');
    }

    // Generate signed URL (expires in 5 minutes)
    const expiresIn = 300; // 5 minutes
    const signedUrl = this.documentSecurity.generateSignedUrl(
      publicId,
      expiresIn,
    );

    // Log document access
    await this.auditService.logDocumentAccess(adminId, verificationId, 'VIEW');

    return {
      signedUrl,
      expiresIn,
    };
  }

  /**
   * Get rate limit info for user
   */
  async getRateLimitInfo(userId: string) {
    return this.rateLimitService.checkRateLimit(userId);
  }
}

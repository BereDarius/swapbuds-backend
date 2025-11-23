import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { VerificationStatus } from '@prisma/client';

/**
 * Service for rate limiting verification submissions
 * Prevents abuse by limiting verification attempts per user
 */
@Injectable()
export class VerificationRateLimitService {
  private readonly MAX_ATTEMPTS = 3; // Max attempts per period
  private readonly PERIOD_DAYS = 30; // Period in days

  constructor(private prisma: PrismaService) {}

  /**
   * Check if user has exceeded rate limit
   * @param userId - User ID to check
   * @returns Object with canSubmit flag and details
   */
  async checkRateLimit(userId: string): Promise<{
    canSubmit: boolean;
    attemptsUsed: number;
    attemptsRemaining: number;
    resetDate: Date;
    message?: string;
  }> {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - this.PERIOD_DAYS);

    // Count submissions in the last period
    const submissions = await this.prisma.userVerification.findMany({
      where: {
        userId,
        submittedAt: {
          gte: periodStart,
        },
      },
      orderBy: {
        submittedAt: 'asc',
      },
    });

    const attemptsUsed = submissions.length;
    const attemptsRemaining = Math.max(0, this.MAX_ATTEMPTS - attemptsUsed);

    // Calculate reset date (30 days from first submission)
    const firstSubmission = submissions[0];
    const resetDate = firstSubmission
      ? new Date(
          firstSubmission.submittedAt.getTime() +
            this.PERIOD_DAYS * 24 * 60 * 60 * 1000,
        )
      : new Date();

    const canSubmit = attemptsUsed < this.MAX_ATTEMPTS;

    return {
      canSubmit,
      attemptsUsed,
      attemptsRemaining,
      resetDate,
      message: canSubmit
        ? undefined
        : `Rate limit exceeded. You can submit ${this.MAX_ATTEMPTS} verifications per ${this.PERIOD_DAYS} days. Your limit will reset on ${resetDate.toLocaleDateString()}.`,
    };
  }

  /**
   * Get rate limit stats for user
   */
  async getRateLimitStats(userId: string): Promise<{
    maxAttempts: number;
    periodDays: number;
    recentSubmissions: Array<{
      id: string;
      status: VerificationStatus;
      submittedAt: Date;
    }>;
  }> {
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - this.PERIOD_DAYS);

    const submissions = await this.prisma.userVerification.findMany({
      where: {
        userId,
        submittedAt: {
          gte: periodStart,
        },
      },
      select: {
        id: true,
        status: true,
        submittedAt: true,
      },
      orderBy: {
        submittedAt: 'desc',
      },
    });

    return {
      maxAttempts: this.MAX_ATTEMPTS,
      periodDays: this.PERIOD_DAYS,
      recentSubmissions: submissions,
    };
  }
}

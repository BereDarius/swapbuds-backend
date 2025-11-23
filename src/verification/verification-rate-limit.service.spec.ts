import { PrismaService } from '@/prisma/prisma.service';
import { Test, TestingModule } from '@nestjs/testing';
import { VerificationStatus } from '@prisma/client';
import { VerificationRateLimitService } from './verification-rate-limit.service';

describe('VerificationRateLimitService', () => {
  let service: VerificationRateLimitService;

  const mockPrismaService = {
    userVerification: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VerificationRateLimitService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<VerificationRateLimitService>(
      VerificationRateLimitService,
    );

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkRateLimit', () => {
    it('should allow submission when no previous attempts', async () => {
      mockPrismaService.userVerification.findMany.mockResolvedValue([]);

      const result = await service.checkRateLimit('user-1');

      expect(result.canSubmit).toBe(true);
      expect(result.attemptsUsed).toBe(0);
      expect(result.attemptsRemaining).toBe(3);
      expect(result.message).toBeUndefined();
      expect(mockPrismaService.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
        }),
      );
    });

    it('should allow submission with remaining attempts', async () => {
      const mockSubmissions = [
        {
          id: 'verif-1',
          userId: 'user-1',
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: VerificationStatus.APPROVED,
        },
        {
          id: 'verif-2',
          userId: 'user-1',
          submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: VerificationStatus.REJECTED,
        },
      ];
      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockSubmissions,
      );

      const result = await service.checkRateLimit('user-1');

      expect(result.canSubmit).toBe(true);
      expect(result.attemptsUsed).toBe(2);
      expect(result.attemptsRemaining).toBe(1);
      expect(result.message).toBeUndefined();
    });

    it('should deny submission when rate limit exceeded', async () => {
      const mockSubmissions = [
        {
          id: 'verif-1',
          userId: 'user-1',
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: VerificationStatus.APPROVED,
        },
        {
          id: 'verif-2',
          userId: 'user-1',
          submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          status: VerificationStatus.REJECTED,
        },
        {
          id: 'verif-3',
          userId: 'user-1',
          submittedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          status: VerificationStatus.REJECTED,
        },
      ];
      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockSubmissions,
      );

      const result = await service.checkRateLimit('user-1');

      expect(result.canSubmit).toBe(false);
      expect(result.attemptsUsed).toBe(3);
      expect(result.attemptsRemaining).toBe(0);
      expect(result.message).toContain('Rate limit exceeded');
      expect(result.message).toContain('3 verifications per 30 days');
    });

    it('should calculate correct reset date', async () => {
      const firstSubmissionDate = new Date(
        Date.now() - 10 * 24 * 60 * 60 * 1000,
      );
      const mockSubmissions = [
        {
          id: 'verif-1',
          userId: 'user-1',
          submittedAt: firstSubmissionDate,
          status: VerificationStatus.APPROVED,
        },
      ];
      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockSubmissions,
      );

      const result = await service.checkRateLimit('user-1');

      const expectedResetDate = new Date(
        firstSubmissionDate.getTime() + 30 * 24 * 60 * 60 * 1000,
      );
      expect(result.resetDate.toDateString()).toBe(
        expectedResetDate.toDateString(),
      );
    });

    it('should only count submissions within the period', async () => {
      const mockSubmissions = [
        {
          id: 'verif-1',
          userId: 'user-1',
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          status: VerificationStatus.APPROVED,
        },
      ];
      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockSubmissions,
      );

      await service.checkRateLimit('user-1');

      expect(mockPrismaService.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            submittedAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        }),
      );
    });
  });

  describe('getRateLimitStats', () => {
    it('should return rate limit configuration and recent submissions', async () => {
      const mockSubmissions = [
        {
          id: 'verif-1',
          status: VerificationStatus.APPROVED,
          submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: 'verif-2',
          status: VerificationStatus.PENDING,
          submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      ];
      mockPrismaService.userVerification.findMany.mockResolvedValue(
        mockSubmissions,
      );

      const result = await service.getRateLimitStats('user-1');

      expect(result.maxAttempts).toBe(3);
      expect(result.periodDays).toBe(30);
      expect(result.recentSubmissions).toEqual(mockSubmissions);
      expect(mockPrismaService.userVerification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'user-1',
          }),
          select: {
            id: true,
            status: true,
            submittedAt: true,
          },
          orderBy: { submittedAt: 'desc' },
        }),
      );
    });

    it('should return empty array when no recent submissions', async () => {
      mockPrismaService.userVerification.findMany.mockResolvedValue([]);

      const result = await service.getRateLimitStats('user-1');

      expect(result.recentSubmissions).toEqual([]);
      expect(result.maxAttempts).toBe(3);
      expect(result.periodDays).toBe(30);
    });

    it('should query submissions within the last 30 days', async () => {
      mockPrismaService.userVerification.findMany.mockResolvedValue([]);

      await service.getRateLimitStats('user-1');

      const callArgs =
        mockPrismaService.userVerification.findMany.mock.calls[0][0];
      const periodStart = callArgs.where.submittedAt.gte;

      const expectedStart = new Date();
      expectedStart.setDate(expectedStart.getDate() - 30);

      // Check that the period start is approximately 30 days ago (within 1 minute tolerance)
      expect(
        Math.abs(periodStart.getTime() - expectedStart.getTime()),
      ).toBeLessThan(60000);
    });
  });
});

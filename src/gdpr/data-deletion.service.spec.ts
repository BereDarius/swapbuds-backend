import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemStatus } from '@prisma/client';
import { DataDeletionService } from './data-deletion.service';

describe('DataDeletionService', () => {
  let service: DataDeletionService;

  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    username: 'testuser',
    isActive: true,
    deletionRequestedAt: null,
    scheduledDeletionAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataDeletionService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DataDeletionService>(DataDeletionService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('requestDeletion', () => {
    it('should request deletion with 30-day grace period', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deletionRequestedAt: new Date(),
        scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.requestDeletion(mockUserId);

      expect(result.message).toContain('Account deletion scheduled');
      expect(result.gracePeriodDays).toBe(30);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          deletionRequestedAt: expect.any(Date),
          scheduledDeletionAt: expect.any(Date),
          isActive: false,
        },
      });
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.requestDeletion(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if deletion already requested', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletionRequestedAt: new Date(),
        scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      await expect(service.requestDeletion(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should calculate correct deletion date', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deletionRequestedAt: new Date(),
        scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      });

      const result = await service.requestDeletion(mockUserId);

      const scheduledDate = new Date(result.scheduledDeletionDate);
      const now = new Date();
      const daysDiff =
        (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeCloseTo(30, 0);
    });
  });

  describe('cancelDeletion', () => {
    it('should cancel pending deletion', async () => {
      const userWithPendingDeletion = {
        ...mockUser,
        deletionRequestedAt: new Date(),
        scheduledDeletionAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      };

      mockPrismaService.user.findUnique.mockResolvedValue(
        userWithPendingDeletion,
      );
      mockPrismaService.user.update.mockResolvedValue({
        ...mockUser,
        deletionRequestedAt: null,
        scheduledDeletionAt: null,
      });

      const result = await service.cancelDeletion(mockUserId);

      expect(result.message).toContain('canceled');
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          deletionRequestedAt: null,
          scheduledDeletionAt: null,
          isActive: true,
        },
      });
    });

    it('should throw error if no pending deletion', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      await expect(service.cancelDeletion(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.cancelDeletion(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getDeletionStatus', () => {
    it('should return status when deletion is pending', async () => {
      const scheduledDate = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      mockPrismaService.user.findUnique.mockResolvedValue({
        ...mockUser,
        deletionRequestedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        scheduledDeletionAt: scheduledDate,
      });

      const result = await service.getDeletionStatus(mockUserId);

      expect(result.deletionRequested).toBe(true);
      expect(result.scheduledDeletionAt).toEqual(scheduledDate);
      expect(result.daysRemaining).toBeGreaterThan(14);
      expect(result.daysRemaining).toBeLessThan(16);
      expect(result.canCancel).toBe(true);
    });

    it('should return no pending status when not requested', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const result = await service.getDeletionStatus(mockUserId);

      expect(result.deletionRequested).toBe(false);
      expect(result.scheduledDeletionAt).toBeNull();
      expect(result.daysRemaining).toBeNull();
      expect(result.canCancel).toBe(false);
    });

    it('should throw error if user not found', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getDeletionStatus(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('processAccountDeletion', () => {
    const userToDelete = {
      ...mockUser,
      deletionRequestedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      scheduledDeletionAt: new Date(Date.now() - 1000),
    };

    beforeEach(() => {
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.review.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.comment.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.notificationPreferences.deleteMany.mockResolvedValue(
        {},
      );
      mockPrismaService.userSettings.deleteMany.mockResolvedValue({});
      mockPrismaService.like.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.userVerification.delete.mockResolvedValue({});
      mockPrismaService.user.delete.mockResolvedValue(userToDelete);
    });

    it('should anonymize user data', async () => {
      await service.processAccountDeletion(mockUserId);

      expect(mockPrismaService.review.updateMany).toHaveBeenCalledWith({
        where: { authorId: mockUserId },
        data: { comment: '[Deleted User Comment]' },
      });

      expect(mockPrismaService.comment.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: { content: '[Deleted User Comment]' },
      });

      expect(mockPrismaService.message.updateMany).toHaveBeenCalledWith({
        where: { senderId: mockUserId },
        data: { content: '[Message deleted]' },
      });
    });

    it('should mark user items as traded', async () => {
      await service.processAccountDeletion(mockUserId);

      expect(mockPrismaService.item.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        data: {
          status: ItemStatus.TRADED,
          description: '[Item from deleted account]',
        },
      });
    });

    it('should delete user-specific data', async () => {
      await service.processAccountDeletion(mockUserId);

      expect(mockPrismaService.notification.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });

      expect(mockPrismaService.like.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should delete user preferences and settings', async () => {
      await service.processAccountDeletion(mockUserId);

      expect(
        mockPrismaService.notificationPreferences.deleteMany,
      ).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });

      expect(mockPrismaService.userSettings.deleteMany).toHaveBeenCalledWith({
        where: { userId: mockUserId },
      });
    });

    it('should delete the user account', async () => {
      await service.processAccountDeletion(mockUserId);

      expect(mockPrismaService.user.delete).toHaveBeenCalledWith({
        where: { id: mockUserId },
      });
    });
  });

  describe('processPendingDeletions', () => {
    it('should process all accounts scheduled for deletion', async () => {
      const usersToDelete = [
        {
          id: 'user-1',
          deletionRequestedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
          scheduledDeletionAt: new Date(Date.now() - 1000),
        },
        {
          id: 'user-2',
          deletionRequestedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
          scheduledDeletionAt: new Date(Date.now() - 2000),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersToDelete);
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.review.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.comment.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.notification.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.like.deleteMany.mockResolvedValue({ count: 0 });
      mockPrismaService.user.delete.mockResolvedValue(usersToDelete[0]);

      await service.processPendingDeletions();

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            scheduledDeletionAt: {
              lte: expect.any(Date),
            },
            deletionRequestedAt: {
              not: null,
            },
          },
        }),
      );

      expect(mockPrismaService.user.delete).toHaveBeenCalledTimes(2);
    });

    it('should handle no pending deletions', async () => {
      mockPrismaService.user.findMany.mockResolvedValue([]);

      await service.processPendingDeletions();

      expect(mockPrismaService.user.delete).not.toHaveBeenCalled();
    });

    it('should continue processing even if one deletion fails', async () => {
      const usersToDelete = [
        {
          id: 'user-1',
          deletionRequestedAt: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
          scheduledDeletionAt: new Date(Date.now() - 1000),
        },
        {
          id: 'user-2',
          deletionRequestedAt: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
          scheduledDeletionAt: new Date(Date.now() - 2000),
        },
      ];

      mockPrismaService.user.findMany.mockResolvedValue(usersToDelete);
      mockPrismaService.item.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.review.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.comment.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.message.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.dispute.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.flaggedItem.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.$transaction.mockResolvedValue([]);
      mockPrismaService.user.delete
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(usersToDelete[1]);

      await service.processPendingDeletions();

      // Should have attempted both deletions
      expect(mockPrismaService.user.delete).toHaveBeenCalledTimes(2);
    });
  });
});

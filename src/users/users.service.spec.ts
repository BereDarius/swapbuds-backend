import { CacheService } from '@/cache/cache.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockUser, mockUserWithProfile } from '@/test/fixtures/user.fixture';
import { mockCacheService } from '@/test/mocks/cache.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { mockUploadService } from '@/test/mocks/upload.mock';
import { UploadService } from '@/upload/upload.service';
import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: typeof mockPrismaService;
  let uploadService: typeof mockUploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
        {
          provide: CacheService,
          useValue: mockCacheService,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = mockPrismaService;
    uploadService = mockUploadService;

    jest.clearAllMocks();
  });

  describe('findAllFiltered', () => {
    const mockUsersList = [
      {
        ...mockUserWithProfile,
        _count: { items: 5, tradesProposed: 3 },
      },
    ];

    it('should filter users by location', async () => {
      const filters = { location: 'New York', page: 1, limit: 20 };
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue(mockUsersList);

      const result = await service.findAllFiltered(filters);

      expect(result.users).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            location: { contains: 'New York', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('should filter users by reputation score range', async () => {
      const filters = {
        minReputation: 3,
        maxReputation: 5,
        page: 1,
        limit: 20,
      };
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue(mockUsersList);

      const result = await service.findAllFiltered(filters);

      expect(result.users).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            reputationScore: { gte: 3, lte: 5 },
          }),
        }),
      );
    });

    it('should search users by username or bio', async () => {
      const filters = { search: 'collector', page: 1, limit: 20 };
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue(mockUsersList);

      const result = await service.findAllFiltered(filters);

      expect(result.users).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        }),
      );
    });

    it('should sort users by reputation score', async () => {
      const filters = {
        page: 1,
        limit: 20,
        sortBy: 'reputationScore' as any,
        sortOrder: 'desc' as any,
      };
      prisma.user.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue(mockUsersList);

      const result = await service.findAllFiltered(filters);

      expect(result.users).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { reputationScore: 'desc' },
        }),
      );
    });

    it('should handle pagination correctly', async () => {
      const filters = { page: 2, limit: 5 };
      prisma.user.count.mockResolvedValue(10);
      prisma.user.findMany.mockResolvedValue(mockUsersList);

      const result = await service.findAllFiltered(filters);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(5);
      expect(result.total).toBe(10);
      expect(result.totalPages).toBe(2);
      expect(prisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        }),
      );
    });

    it('should return empty results when no users match filters', async () => {
      const filters = { location: 'NonExistent', page: 1, limit: 20 };
      prisma.user.count.mockResolvedValue(0);
      prisma.user.findMany.mockResolvedValue([]);

      const result = await service.findAllFiltered(filters);

      expect(result.users).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('getUserProfile', () => {
    const userId = 'clxy1234567890abcdefghijk'; // CUID format

    it('should return cached profile when cache hit', async () => {
      const cachedProfile = {
        id: userId,
        username: mockUserWithProfile.username,
        email: mockUserWithProfile.email,
        bio: mockUserWithProfile.bio,
        location: mockUserWithProfile.location,
        avatarUrl: mockUserWithProfile.avatarUrl,
        itemsCount: 5,
        tradesCount: 3,
        createdAt: mockUserWithProfile.createdAt,
      };
      mockCacheService.get.mockResolvedValue(cachedProfile);

      const result = await service.getUserProfile(userId);

      expect(mockCacheService.get).toHaveBeenCalledWith(`users:${userId}`);
      expect(prisma.user.findUnique).not.toHaveBeenCalled(); // DB not queried on cache hit
      expect(result).toEqual(cachedProfile);
    });

    it('should query database and cache result when cache miss', async () => {
      mockCacheService.get.mockResolvedValue(null); // Cache miss
      const userWithCounts = {
        ...mockUserWithProfile,
        id: userId, // Use the CUID from the test
        _count: {
          items: 5,
          tradesProposed: 3,
        },
      };

      prisma.user.findUnique.mockResolvedValue(userWithCounts);

      const result = await service.getUserProfile(userId);

      expect(mockCacheService.get).toHaveBeenCalledWith(`users:${userId}`);
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        include: {
          _count: {
            select: {
              items: true,
              tradesProposed: {
                where: { status: 'COMPLETED' },
              },
            },
          },
        },
      });
      expect(mockCacheService.set).toHaveBeenCalledWith(
        `users:${userId}`,
        expect.any(Object),
        600000, // 10 minutes
      );
      expect(result.id).toBe(userId);
      expect(result.username).toBe(mockUserWithProfile.username);
      expect(result.itemsCount).toBe(5);
      expect(result.tradesCount).toBe(3);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserProfile(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserProfile(userId)).rejects.toThrow(
        `User with ID ${userId} not found`,
      );
    });
  });

  describe('updateProfile', () => {
    const userId = 'user-1';
    const updateProfileDto = {
      bio: 'Updated bio',
      location: 'Updated location',
    };

    it('should update user profile successfully', async () => {
      const userWithCounts = {
        ...mockUserWithProfile,
        ...updateProfileDto,
        _count: {
          items: 5,
          tradesProposed: 3,
        },
      };

      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      prisma.user.update.mockResolvedValue(userWithCounts);
      prisma.user.findUnique.mockResolvedValueOnce(userWithCounts);

      const result = await service.updateProfile(userId, updateProfileDto);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
      });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateProfileDto,
      });
      expect(result.bio).toBe(updateProfileDto.bio);
      expect(result.location).toBe(updateProfileDto.location);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateProfile(userId, updateProfileDto),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateProfile(userId, updateProfileDto),
      ).rejects.toThrow(`User with ID ${userId} not found`);
    });
  });

  describe('getUserSettings', () => {
    const userId = 'user-1';

    it('should return existing user settings', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId,
        emailNotifications: true,
        pushNotifications: true,
        emailTradeProposal: true,
        emailTradeAccepted: true,
        pushTradeProposal: true,
        pushTradeAccepted: true,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userSettings.findUnique.mockResolvedValue(mockSettings);

      const result = await service.getUserSettings(userId);

      expect(result).toEqual(mockSettings);
      expect(prisma.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId },
      });
    });

    it('should create default settings if none exist', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId,
        emailNotifications: true,
        pushNotifications: true,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userSettings.findUnique.mockResolvedValue(null);
      prisma.userSettings.create.mockResolvedValue(mockSettings);

      const result = await service.getUserSettings(userId);

      expect(result).toEqual(mockSettings);
      expect(prisma.userSettings.create).toHaveBeenCalledWith({
        data: { userId },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserSettings(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getUserSettings(userId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('updateUserSettings', () => {
    const userId = 'user-1';
    const updateData = {
      emailNotifications: false,
      pushNotifications: true,
    };

    it('should update existing settings successfully', async () => {
      const existingSettings = {
        id: 'settings-1',
        userId,
        emailNotifications: true,
        pushNotifications: false,
      };
      const updatedSettings = {
        ...existingSettings,
        ...updateData,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userSettings.findUnique.mockResolvedValue(existingSettings);
      prisma.userSettings.update.mockResolvedValue(updatedSettings);

      const result = await service.updateUserSettings(userId, updateData);

      expect(result).toEqual(updatedSettings);
      expect(prisma.userSettings.update).toHaveBeenCalledWith({
        where: { userId },
        data: updateData,
      });
    });

    it('should create settings if none exist', async () => {
      const newSettings = {
        id: 'settings-1',
        userId,
        ...updateData,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userSettings.findUnique.mockResolvedValue(null);
      prisma.userSettings.create.mockResolvedValue(newSettings);

      const result = await service.updateUserSettings(userId, updateData);

      expect(result).toEqual(newSettings);
      expect(prisma.userSettings.create).toHaveBeenCalledWith({
        data: { userId, ...updateData },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateUserSettings(userId, updateData),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateUserSettings(userId, updateData),
      ).rejects.toThrow('User not found');
    });
  });

  describe('resetUserSettings', () => {
    const userId = 'user-1';

    it('should reset user settings to defaults', async () => {
      const mockSettings = {
        id: 'settings-1',
        userId,
        emailNotifications: true,
        pushNotifications: true,
      };

      prisma.user.findUnique.mockResolvedValue(mockUser);
      prisma.userSettings.deleteMany.mockResolvedValue({ count: 1 });
      prisma.userSettings.create.mockResolvedValue(mockSettings);

      const result = await service.resetUserSettings(userId);

      expect(result).toEqual(mockSettings);
      expect(prisma.userSettings.deleteMany).toHaveBeenCalledWith({
        where: { userId },
      });
      expect(prisma.userSettings.create).toHaveBeenCalledWith({
        data: { userId },
      });
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.resetUserSettings(userId)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.resetUserSettings(userId)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('uploadAvatar', () => {
    const userId = 'user-1';
    const mockFile = {
      buffer: Buffer.from('test'),
      originalname: 'avatar.jpg',
      mimetype: 'image/jpeg',
    } as Express.Multer.File;

    it('should upload avatar successfully without deleting old avatar', async () => {
      const uploadResult = {
        secure_url: 'https://cloudinary.com/new-avatar.jpg',
        public_id: 'avatars/new-avatar',
      };
      const userWithCounts = {
        ...mockUser,
        avatarUrl: uploadResult.secure_url,
        _count: { items: 0, tradesProposed: 0 },
      };

      prisma.user.findUnique.mockResolvedValueOnce(mockUser);
      uploadService.uploadImage.mockResolvedValue(uploadResult);
      prisma.user.update.mockResolvedValue(userWithCounts);
      prisma.user.findUnique.mockResolvedValueOnce(userWithCounts);

      const result = await service.uploadAvatar(userId, mockFile);

      expect(uploadService.uploadImage).toHaveBeenCalledWith(
        mockFile,
        'swapbuds/avatars',
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: { avatarUrl: uploadResult.secure_url },
      });
      expect(result.avatarUrl).toBe(uploadResult.secure_url);
    });

    it('should delete old avatar before uploading new one', async () => {
      const oldAvatarUrl =
        'https://res.cloudinary.com/test/image/upload/v123/avatars/old-avatar.jpg';
      const uploadResult = {
        secure_url: 'https://cloudinary.com/new-avatar.jpg',
        public_id: 'avatars/new-avatar',
      };
      const userWithCounts = {
        ...mockUser,
        avatarUrl: uploadResult.secure_url,
        _count: { items: 0, tradesProposed: 0 },
      };

      prisma.user.findUnique.mockResolvedValueOnce({
        ...mockUser,
        avatarUrl: oldAvatarUrl,
      });
      uploadService.uploadImage.mockResolvedValue(uploadResult);
      uploadService.deleteImage.mockResolvedValue({ result: 'ok' });
      prisma.user.update.mockResolvedValue(userWithCounts);
      prisma.user.findUnique.mockResolvedValueOnce(userWithCounts);

      const result = await service.uploadAvatar(userId, mockFile);

      expect(uploadService.deleteImage).toHaveBeenCalledWith('old-avatar');
      expect(result.avatarUrl).toBe(uploadResult.secure_url);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.uploadAvatar(userId, mockFile)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getUserStatistics', () => {
    const userId = 'user-123';

    it('should return user trade statistics', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      // Mock all the count queries
      prisma.trade.count
        .mockResolvedValueOnce(10) // tradesInitiated
        .mockResolvedValueOnce(15) // tradesReceived
        .mockResolvedValueOnce(8) // completedTrades
        .mockResolvedValueOnce(10) // acceptedTrades
        .mockResolvedValueOnce(5) // rejectedTrades
        .mockResolvedValueOnce(2) // cancelledTrades
        .mockResolvedValueOnce(3) // expiredTrades
        .mockResolvedValueOnce(4) // counterOffers
        .mockResolvedValueOnce(2) // pendingAsProposer
        .mockResolvedValueOnce(3); // pendingAsResponder

      // Mock trades for average response time calculation
      const mockTrades = [
        {
          createdAt: new Date('2024-01-01T10:00:00Z'),
          updatedAt: new Date('2024-01-01T22:00:00Z'), // 12 hours later
        },
        {
          createdAt: new Date('2024-01-02T10:00:00Z'),
          updatedAt: new Date('2024-01-03T10:00:00Z'), // 24 hours later
        },
      ];
      prisma.trade.findMany.mockResolvedValue(mockTrades);

      const result = await service.getUserStatistics(userId);

      expect(result).toEqual({
        totalTradesInitiated: 10,
        totalTradesReceived: 15,
        totalCompletedTrades: 8,
        totalAcceptedTrades: 10,
        totalRejectedTrades: 5,
        totalCancelledTrades: 2,
        totalExpiredTrades: 3,
        successRate: 32, // 8 / (10 + 15) * 100 = 32%
        averageResponseTime: 18, // (12 + 24) / 2 = 18 hours
        totalCounterOffers: 4,
        pendingAsProposer: 2,
        pendingAsResponder: 3,
      });
    });

    it('should return null averageResponseTime if no responded trades', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      prisma.trade.count
        .mockResolvedValueOnce(5) // tradesInitiated
        .mockResolvedValueOnce(0) // tradesReceived
        .mockResolvedValueOnce(2) // completedTrades
        .mockResolvedValueOnce(2) // acceptedTrades
        .mockResolvedValueOnce(1) // rejectedTrades
        .mockResolvedValueOnce(0) // cancelledTrades
        .mockResolvedValueOnce(0) // expiredTrades
        .mockResolvedValueOnce(0) // counterOffers
        .mockResolvedValueOnce(2) // pendingAsProposer
        .mockResolvedValueOnce(0); // pendingAsResponder

      prisma.trade.findMany.mockResolvedValue([]); // No responded trades

      const result = await service.getUserStatistics(userId);

      expect(result.averageResponseTime).toBeNull();
      expect(result.successRate).toBe(40); // 2 / 5 * 100 = 40%
    });

    it('should return 0 success rate if no trades', async () => {
      prisma.user.findUnique.mockResolvedValue(mockUser);

      prisma.trade.count
        .mockResolvedValueOnce(0) // tradesInitiated
        .mockResolvedValueOnce(0) // tradesReceived
        .mockResolvedValueOnce(0) // completedTrades
        .mockResolvedValueOnce(0) // acceptedTrades
        .mockResolvedValueOnce(0) // rejectedTrades
        .mockResolvedValueOnce(0) // cancelledTrades
        .mockResolvedValueOnce(0) // expiredTrades
        .mockResolvedValueOnce(0) // counterOffers
        .mockResolvedValueOnce(0) // pendingAsProposer
        .mockResolvedValueOnce(0); // pendingAsResponder

      prisma.trade.findMany.mockResolvedValue([]);

      const result = await service.getUserStatistics(userId);

      expect(result.successRate).toBe(0);
      expect(result.totalTradesInitiated).toBe(0);
      expect(result.totalTradesReceived).toBe(0);
    });

    it('should throw NotFoundException if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.getUserStatistics(userId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});

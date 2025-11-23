import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { DataExportService } from './data-export.service';

describe('DataExportService', () => {
  let service: DataExportService;

  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    email: 'test@example.com',
    username: 'testuser',
    firstName: 'Test',
    lastName: 'User',
    bio: 'Test bio',
    location: 'Test City',
    avatarUrl: 'https://example.com/avatar.jpg',
    isVerified: true,
    reputationScore: 95,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DataExportService>(DataExportService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateExport', () => {
    beforeEach(() => {
      // Mock all data retrieval methods
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);
      mockPrismaService.item.findMany.mockResolvedValue([]);
      mockPrismaService.trade.findMany.mockResolvedValue([]);
      mockPrismaService.message.findMany.mockResolvedValue([]);
      mockPrismaService.review.findMany.mockResolvedValue([]);
      mockPrismaService.notification.findMany.mockResolvedValue([]);
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        null,
      );
      mockPrismaService.like.findMany.mockResolvedValue([]);
      mockPrismaService.comment.findMany.mockResolvedValue([]);
      mockPrismaService.dispute.findMany.mockResolvedValue([]);
      mockPrismaService.userVerification.findUnique.mockResolvedValue(null);
      mockPrismaService.supportChat.findMany.mockResolvedValue([]);
    });

    it('should generate a complete data export', async () => {
      const exportId = await service.generateExport(mockUserId);

      expect(exportId).toBeDefined();
      expect(typeof exportId).toBe('string');
      expect(exportId).toContain('export-');
      expect(exportId).toContain(mockUserId);
    });

    it('should create export with correct expiry time', async () => {
      const exportId = await service.generateExport(mockUserId);

      // Access internal storage to check expiry
      const exports = (service as any).exports;
      const exportData = exports.get(exportId);

      const expiryDate = new Date(exportData.expiresAt);
      const now = new Date();
      const daysDiff =
        (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

      expect(daysDiff).toBeCloseTo(7, 1);
    });

    it('should fetch all required user data', async () => {
      await service.generateExport(mockUserId);

      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
        select: expect.any(Object),
      });
      expect(mockPrismaService.item.findMany).toHaveBeenCalled();
      expect(mockPrismaService.trade.findMany).toHaveBeenCalledTimes(2); // proposed and received
      expect(mockPrismaService.message.findMany).toHaveBeenCalled();
      expect(mockPrismaService.review.findMany).toHaveBeenCalledTimes(2); // given and received
    });
  });

  describe('getExport', () => {
    it('should return export data if exists and not expired', async () => {
      const exportId = await service.generateExport(mockUserId);

      const result = await service.getExport(exportId);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('profile');
      expect(result).toHaveProperty('items');
      expect(result).toHaveProperty('trades');
    });

    it('should throw error if export not found', async () => {
      await expect(service.getExport('invalid-export-id')).rejects.toThrow(
        'Export not found or expired',
      );
    });

    it('should remove expired exports', async () => {
      // Generate an export
      const exportId = await service.generateExport(mockUserId);

      // Manually expire it by manipulating the internal storage
      const exports = (service as any).exports;
      const exportData = exports.get(exportId);
      exportData.expiresAt = new Date(Date.now() - 1000); // Set to past

      await expect(service.getExport(exportId)).rejects.toThrow(
        'Export has expired',
      );
    });
  });

  describe('cleanupExpiredExports', () => {
    it('should remove expired exports', async () => {
      // Generate multiple exports
      const export1 = await service.generateExport(mockUserId);
      const export2 = await service.generateExport('user-456');

      // Manually expire one
      const exports = (service as any).exports;
      const exportData = exports.get(export1);
      exportData.expiresAt = new Date(Date.now() - 1000);

      // Run cleanup
      await service.cleanupExpiredExports();

      // Expired export should be gone
      await expect(service.getExport(export1)).rejects.toThrow();

      // Non-expired should still exist
      const result = await service.getExport(export2);
      expect(result).toBeDefined();
    });

    it('should not remove non-expired exports', async () => {
      const exportId = await service.generateExport(mockUserId);

      await service.cleanupExpiredExports();

      const result = await service.getExport(exportId);
      expect(result).toBeDefined();
    });
  });

  describe('data collection methods', () => {
    it('should collect profile data correctly', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const exportId = await service.generateExport(mockUserId);
      const result = await service.getExport(exportId);

      expect(result.profile).toMatchObject({
        email: mockUser.email,
        username: mockUser.username,
        firstName: mockUser.firstName,
        lastName: mockUser.lastName,
      });
    });

    it('should collect items data', async () => {
      const mockItems = [
        {
          id: 'item-1',
          title: 'Test Item',
          description: 'Test description',
          status: 'AVAILABLE',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.item.findMany.mockResolvedValue(mockItems);

      const exportId = await service.generateExport(mockUserId);
      const result = await service.getExport(exportId);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Test Item');
    });

    it('should collect trades data (proposed and received)', async () => {
      const mockTrades = [
        {
          id: 'trade-1',
          status: 'COMPLETED',
          itemOfferedId: 'item-1',
          itemRequestedId: 'item-2',
          deliveryMethod: 'MEET_IN_PERSON',
          createdAt: new Date(),
          completedAt: new Date(),
        },
      ];

      mockPrismaService.trade.findMany.mockResolvedValue(mockTrades);

      const exportId = await service.generateExport(mockUserId);
      const result = await service.getExport(exportId);

      expect(result.trades.proposed).toEqual(mockTrades);
      expect(result.trades.received).toEqual(mockTrades);
    });

    it('should collect reviews data (given and received)', async () => {
      const mockReviews = [
        {
          id: 'review-1',
          rating: 5,
          comment: 'Great trader!',
          tradeId: 'trade-1',
          createdAt: new Date(),
        },
      ];

      mockPrismaService.review.findMany.mockResolvedValue(mockReviews);

      const exportId = await service.generateExport(mockUserId);
      const result = await service.getExport(exportId);

      expect(result.reviews.given).toEqual(mockReviews);
      expect(result.reviews.received).toEqual(mockReviews);
    });

    it('should handle missing optional data gracefully', async () => {
      mockPrismaService.userSettings.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreferences.findUnique.mockResolvedValue(
        null,
      );

      const exportId = await service.generateExport(mockUserId);
      const result = await service.getExport(exportId);

      expect(result.settings).toBeNull();
      expect(result.preferences).toBeNull();
    });
  });
});

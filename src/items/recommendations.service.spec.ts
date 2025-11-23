import { PrismaService } from '@/prisma/prisma.service';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { DeliveryMethod, ItemCategory, ItemStatus } from '@prisma/client';
import { RecommendationsService } from './recommendations.service';

describe('RecommendationsService', () => {
  let service: RecommendationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getRecommendations', () => {
    it('should return empty array if recommendations are disabled', async () => {
      mockPrismaService.userSettings.findUnique.mockResolvedValue({
        enableRecommendations: false,
      });

      const result = await service.getRecommendations('user-123');

      expect(result).toEqual([]);
      expect(mockPrismaService.userSettings.findUnique).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        select: {
          preferredDeliveryMethod: true,
          enableRecommendations: true,
        },
      });
    });

    it('should get recommendations based on user preferences', async () => {
      const userId = 'user-123';
      const userItems = [
        {
          estimatedValue: 100,
          category: ItemCategory.ELECTRONICS,
        },
        {
          estimatedValue: 150,
          category: ItemCategory.ELECTRONICS,
        },
      ];

      const likedItems = [
        {
          item: {
            category: ItemCategory.ELECTRONICS,
            estimatedValue: 120,
          },
        },
      ];

      const recommendedItems = [
        {
          id: 'item-1',
          title: 'Gaming Console',
          category: ItemCategory.ELECTRONICS,
          estimatedValue: 130,
          createdAt: new Date(),
          user: {
            id: 'user-456',
            username: 'gamer',
            avatarUrl: null,
            reputationScore: 4.5,
          },
          images: [],
          _count: {
            likes: 10,
            comments: 5,
          },
        },
      ];

      mockPrismaService.userSettings.findUnique.mockResolvedValue({
        preferredDeliveryMethod: DeliveryMethod.MAIL,
        enableRecommendations: true,
      });

      mockPrismaService.item.findMany
        .mockResolvedValueOnce(userItems) // User's items
        .mockResolvedValueOnce(recommendedItems); // Recommended items

      mockPrismaService.like.findMany.mockResolvedValue(likedItems);

      const result = await service.getRecommendations(userId, 10);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('recommendationScore');
    });

    it('should filter by preferred delivery method', async () => {
      mockPrismaService.userSettings.findUnique.mockResolvedValue({
        preferredDeliveryMethod: DeliveryMethod.MAIL,
        enableRecommendations: true,
      });

      mockPrismaService.item.findMany
        .mockResolvedValueOnce([]) // No user items
        .mockResolvedValueOnce([]); // No recommendations

      mockPrismaService.like.findMany.mockResolvedValue([]);

      await service.getRecommendations('user-123');

      // Check that the second findMany call (for recommendations) includes delivery method filter
      const recommendationsCall = mockPrismaService.item.findMany.mock.calls[1];
      expect(recommendationsCall[0].where).toHaveProperty('deliveryMethods', {
        has: DeliveryMethod.MAIL,
      });
    });

    it('should filter by value range (±20%)', async () => {
      const avgValue = 100;
      const userItems = [
        { estimatedValue: avgValue, category: ItemCategory.ELECTRONICS },
      ];

      mockPrismaService.userSettings.findUnique.mockResolvedValue({
        enableRecommendations: true,
      });

      mockPrismaService.item.findMany
        .mockResolvedValueOnce(userItems)
        .mockResolvedValueOnce([]);

      mockPrismaService.like.findMany.mockResolvedValue([]);

      await service.getRecommendations('user-123');

      const recommendationsCall = mockPrismaService.item.findMany.mock.calls[1];
      expect(recommendationsCall[0].where.estimatedValue).toEqual({
        gte: avgValue * 0.8,
        lte: avgValue * 1.2,
      });
    });
  });

  describe('getSimilarItems', () => {
    it('should return empty array if item not found', async () => {
      mockPrismaService.item.findUnique.mockResolvedValue(null);

      const result = await service.getSimilarItems('invalid-id');

      expect(result).toEqual([]);
    });

    it('should find similar items by category and value', async () => {
      const targetItem = {
        id: 'item-1',
        userId: 'user-123',
        category: ItemCategory.ELECTRONICS,
        estimatedValue: 100,
        deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
        condition: 'GOOD',
      };

      const similarItems = [
        {
          id: 'item-2',
          title: 'Similar Item',
          category: ItemCategory.ELECTRONICS,
          estimatedValue: 95,
          user: {
            id: 'user-456',
            username: 'seller',
            avatarUrl: null,
            reputationScore: 4.0,
          },
          images: [],
          _count: { likes: 5 },
          createdAt: new Date(),
        },
      ];

      mockPrismaService.item.findUnique.mockResolvedValue(targetItem);
      mockPrismaService.item.findMany.mockResolvedValue(similarItems);

      const result = await service.getSimilarItems('item-1', 5);

      expect(result).toEqual(similarItems);
      expect(mockPrismaService.item.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          id: { not: 'item-1' },
          userId: { not: 'user-123' },
          category: ItemCategory.ELECTRONICS,
          status: ItemStatus.AVAILABLE,
        }),
        include: expect.any(Object),
        take: 5,
        orderBy: [{ createdAt: 'desc' }],
      });
    });

    it('should apply value range filter (±30%)', async () => {
      const targetValue = 100;
      const targetItem = {
        userId: 'user-123',
        category: ItemCategory.ELECTRONICS,
        estimatedValue: targetValue,
        deliveryMethods: [DeliveryMethod.MAIL],
        condition: 'GOOD',
      };

      mockPrismaService.item.findUnique.mockResolvedValue(targetItem);
      mockPrismaService.item.findMany.mockResolvedValue([]);

      await service.getSimilarItems('item-1');

      const findManyCall = mockPrismaService.item.findMany.mock.calls[0];
      expect(findManyCall[0].where.estimatedValue).toEqual({
        gte: targetValue * 0.7,
        lte: targetValue * 1.3,
      });
    });

    it('should filter by delivery methods', async () => {
      const targetItem = {
        userId: 'user-123',
        category: ItemCategory.ELECTRONICS,
        estimatedValue: null,
        deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
        condition: 'GOOD',
      };

      mockPrismaService.item.findUnique.mockResolvedValue(targetItem);
      mockPrismaService.item.findMany.mockResolvedValue([]);

      await service.getSimilarItems('item-1');

      const findManyCall = mockPrismaService.item.findMany.mock.calls[0];
      expect(findManyCall[0].where.deliveryMethods).toEqual({
        hasEvery: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
      });
    });
  });
});

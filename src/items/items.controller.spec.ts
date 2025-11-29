import { ItemsController } from '@/items/items.controller';
import { ItemsService } from '@/items/items.service';
import { RecommendationsService } from '@/items/recommendations.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  mockItem,
  mockItemWithRelations,
  mockItems,
} from '@/test/fixtures/item.fixture';
import { mockItemsService } from '@/test/mocks/items.mock';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { mockRecommendationsService } from '@/test/mocks/recommendations.mock';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ItemCategory, ItemCondition } from '@prisma/client';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

describe('ItemsController', () => {
  let controller: ItemsController;
  let itemsService: ItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ItemsController],
      providers: [
        {
          provide: ItemsService,
          useValue: mockItemsService,
        },
        {
          provide: RecommendationsService,
          useValue: mockRecommendationsService,
        },
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    controller = module.get<ItemsController>(ItemsController);
    itemsService = module.get<ItemsService>(ItemsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an item successfully', async () => {
      const userId = 'user-123';
      const createItemDto: CreateItemDto = {
        title: 'Test Item',
        description: 'Test description for item',
        category: ItemCategory.ELECTRONICS,
        condition: ItemCondition.GOOD,
        images: ['https://example.com/image1.jpg'],
      };

      mockItemsService.create.mockResolvedValue(mockItemWithRelations);

      const result = await controller.create(userId, createItemDto);

      expect(result).toEqual(mockItemWithRelations);
      expect(itemsService.create).toHaveBeenCalledWith(userId, createItemDto);
      expect(itemsService.create).toHaveBeenCalledTimes(1);
    });

    it('should create an item without images', async () => {
      const userId = 'user-123';
      const createItemDto: CreateItemDto = {
        title: 'Test Item',
        description: 'Test description for item',
        category: ItemCategory.BOOKS,
        condition: ItemCondition.NEW,
      };

      mockItemsService.create.mockResolvedValue(mockItem);

      const result = await controller.create(userId, createItemDto);

      expect(result).toEqual(mockItem);
      expect(itemsService.create).toHaveBeenCalledWith(userId, createItemDto);
    });
  });

  describe('findAll', () => {
    it('should return array of items with default pagination', async () => {
      mockItemsService.findAll.mockResolvedValue(mockItems);

      const result = await controller.findAll({});

      expect(result).toEqual({ items: mockItems, total: mockItems.length });
      expect(itemsService.findAll).toHaveBeenCalledWith(0, 20);
      expect(itemsService.findAll).toHaveBeenCalledTimes(1);
    });

    it('should return array of items with custom pagination via skip/take', async () => {
      mockItemsService.findAll.mockResolvedValue(mockItems);

      const result = await controller.findAll({}, '10', '5');

      expect(result).toEqual({ items: mockItems, total: mockItems.length });
      expect(itemsService.findAll).toHaveBeenCalledWith(10, 5);
    });

    it('should handle skip parameter with legacy pagination', async () => {
      mockItemsService.findAll.mockResolvedValue([mockItems[0]]);

      const result = await controller.findAll({}, '1');

      expect(result).toEqual({ items: [mockItems[0]], total: 1 });
      expect(itemsService.findAll).toHaveBeenCalledWith(1, 20);
    });

    it('should use filtered method when filters provided', async () => {
      const filters = { category: 'Electronics', page: 1, limit: 10 };
      const filteredResult = {
        items: mockItems,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      };
      mockItemsService.findAllFiltered.mockResolvedValue(filteredResult);

      const result = await controller.findAll(filters as any);

      expect(result).toEqual(filteredResult);
      expect(itemsService.findAllFiltered).toHaveBeenCalledWith(filters);
    });

    it('should handle take parameter', async () => {
      mockItemsService.findAll.mockResolvedValue([mockItems[0]]);

      const result = await controller.findAll({}, undefined, '1');

      expect(result).toEqual({ items: [mockItems[0]], total: 1 });
      expect(itemsService.findAll).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('findByUser', () => {
    it('should return items for specific user', async () => {
      const userId = 'user-123';
      mockItemsService.findByUser.mockResolvedValue(mockItems);

      const result = await controller.findByUser(userId);

      expect(result).toEqual(mockItems);
      expect(itemsService.findByUser).toHaveBeenCalledWith(userId);
      expect(itemsService.findByUser).toHaveBeenCalledTimes(1);
    });

    it('should return empty array when user has no items', async () => {
      const userId = 'user-456';
      mockItemsService.findByUser.mockResolvedValue([]);

      const result = await controller.findByUser(userId);

      expect(result).toEqual([]);
      expect(itemsService.findByUser).toHaveBeenCalledWith(userId);
    });
  });

  describe('findOne', () => {
    it('should return a single item by id', async () => {
      const itemId = 'item-123';
      mockItemsService.findOne.mockResolvedValue(mockItemWithRelations);

      const result = await controller.findOne(itemId);

      expect(result).toEqual(mockItemWithRelations);
      expect(itemsService.findOne).toHaveBeenCalledWith(itemId);
      expect(itemsService.findOne).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      const itemId = 'non-existent';
      mockItemsService.findOne.mockRejectedValue(
        new NotFoundException('Item not found'),
      );

      await expect(controller.findOne(itemId)).rejects.toThrow(
        NotFoundException,
      );
      expect(itemsService.findOne).toHaveBeenCalledWith(itemId);
    });
  });

  describe('update', () => {
    it('should update an item successfully', async () => {
      const itemId = 'item-123';
      const userId = 'user-123';
      const updateItemDto: UpdateItemDto = {
        title: 'Updated Item',
        description: 'Updated description for item',
      };

      const updatedItem = { ...mockItemWithRelations, ...updateItemDto };
      mockItemsService.update.mockResolvedValue(updatedItem);

      const result = await controller.update(itemId, userId, updateItemDto);

      expect(result).toEqual(updatedItem);
      expect(itemsService.update).toHaveBeenCalledWith(
        itemId,
        userId,
        updateItemDto,
      );
      expect(itemsService.update).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      const itemId = 'non-existent';
      const userId = 'user-123';
      const updateItemDto: UpdateItemDto = { title: 'Updated Item Title' };

      mockItemsService.update.mockRejectedValue(
        new NotFoundException('Item not found'),
      );

      await expect(
        controller.update(itemId, userId, updateItemDto),
      ).rejects.toThrow(NotFoundException);
      expect(itemsService.update).toHaveBeenCalledWith(
        itemId,
        userId,
        updateItemDto,
      );
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const itemId = 'item-123';
      const userId = 'wrong-user';
      const updateItemDto: UpdateItemDto = { title: 'Updated Item Title' };

      mockItemsService.update.mockRejectedValue(
        new ForbiddenException('You can only update your own items'),
      );

      await expect(
        controller.update(itemId, userId, updateItemDto),
      ).rejects.toThrow(ForbiddenException);
      expect(itemsService.update).toHaveBeenCalledWith(
        itemId,
        userId,
        updateItemDto,
      );
    });
  });

  describe('remove', () => {
    it('should delete an item successfully', async () => {
      const itemId = 'item-123';
      const userId = 'user-123';

      mockItemsService.remove.mockResolvedValue(undefined);

      const result = await controller.remove(itemId, userId);

      expect(result).toBeUndefined();
      expect(itemsService.remove).toHaveBeenCalledWith(itemId, userId);
      expect(itemsService.remove).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when item not found', async () => {
      const itemId = 'non-existent';
      const userId = 'user-123';

      mockItemsService.remove.mockRejectedValue(
        new NotFoundException('Item not found'),
      );

      await expect(controller.remove(itemId, userId)).rejects.toThrow(
        NotFoundException,
      );
      expect(itemsService.remove).toHaveBeenCalledWith(itemId, userId);
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      const itemId = 'item-123';
      const userId = 'wrong-user';

      mockItemsService.remove.mockRejectedValue(
        new ForbiddenException('You can only delete your own items'),
      );

      await expect(controller.remove(itemId, userId)).rejects.toThrow(
        ForbiddenException,
      );
      expect(itemsService.remove).toHaveBeenCalledWith(itemId, userId);
    });
  });

  describe('getRecommendations', () => {
    it('should return personalized recommendations for user', async () => {
      const userId = 'user-123';
      const mockRecommendations = {
        recommendations: [mockItem, mockItemWithRelations],
        metadata: {
          basedOn: ['user-interests', 'recent-activity'],
          totalFound: 2,
        },
      };

      mockRecommendationsService.getRecommendations.mockResolvedValue(
        mockRecommendations,
      );

      const result = await controller.getRecommendations(userId);

      expect(result).toEqual(mockRecommendations);
      expect(
        mockRecommendationsService.getRecommendations,
      ).toHaveBeenCalledWith(userId, 10);
    });

    it('should use custom limit when provided', async () => {
      const userId = 'user-123';
      const limit = '20';

      mockRecommendationsService.getRecommendations.mockResolvedValue({
        recommendations: [],
        metadata: { basedOn: [], totalFound: 0 },
      });

      await controller.getRecommendations(userId, limit);

      expect(
        mockRecommendationsService.getRecommendations,
      ).toHaveBeenCalledWith(userId, 20);
    });

    it('should default to 10 items when limit not provided', async () => {
      const userId = 'user-123';

      mockRecommendationsService.getRecommendations.mockResolvedValue({
        recommendations: [],
        metadata: { basedOn: [], totalFound: 0 },
      });

      await controller.getRecommendations(userId);

      expect(
        mockRecommendationsService.getRecommendations,
      ).toHaveBeenCalledWith(userId, 10);
    });
  });

  describe('getSimilarItems', () => {
    it('should return similar items for a given item', async () => {
      const itemId = 'item-123';
      const mockSimilarItems = {
        similarItems: [mockItem, mockItemWithRelations],
        metadata: {
          similarity: 'category-and-condition',
          totalFound: 2,
        },
      };

      mockRecommendationsService.getSimilarItems.mockResolvedValue(
        mockSimilarItems,
      );

      const result = await controller.getSimilarItems(itemId);

      expect(result).toEqual(mockSimilarItems);
      expect(mockRecommendationsService.getSimilarItems).toHaveBeenCalledWith(
        itemId,
        5,
      );
    });

    it('should use custom limit when provided', async () => {
      const itemId = 'item-123';
      const limit = '10';

      mockRecommendationsService.getSimilarItems.mockResolvedValue({
        similarItems: [],
        metadata: { similarity: '', totalFound: 0 },
      });

      await controller.getSimilarItems(itemId, limit);

      expect(mockRecommendationsService.getSimilarItems).toHaveBeenCalledWith(
        itemId,
        10,
      );
    });

    it('should default to 5 items when limit not provided', async () => {
      const itemId = 'item-123';

      mockRecommendationsService.getSimilarItems.mockResolvedValue({
        similarItems: [],
        metadata: { similarity: '', totalFound: 0 },
      });

      await controller.getSimilarItems(itemId);

      expect(mockRecommendationsService.getSimilarItems).toHaveBeenCalledWith(
        itemId,
        5,
      );
    });
  });
});

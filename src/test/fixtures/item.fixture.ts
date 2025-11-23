import {
  DeliveryMethod,
  DeliveryScope,
  ItemCategory,
  ItemCondition,
  ItemStatus,
} from '@prisma/client';

/**
 * Test fixtures for Item entities
 */
export const mockItem = {
  id: 'item-1',
  title: 'Test Item',
  description: 'Test item description',
  condition: ItemCondition.GOOD,
  category: ItemCategory.ELECTRONICS,
  status: ItemStatus.AVAILABLE,
  userId: 'user-1',
  deliveryMethods: [DeliveryMethod.PHYSICAL, DeliveryMethod.MAIL],
  deliveryScope: DeliveryScope.NATIONAL,
  estimatedValue: null,
  currency: 'EUR',
  viewCount: 0,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const mockItemWithRelations = {
  ...mockItem,
  user: {
    id: 'user-1',
    username: 'testuser',
    avatarUrl: null,
  },
  images: [
    {
      id: 'img-1',
      url: 'https://cloudinary.com/image1.jpg',
      publicId: 'items/image1',
      order: 0,
      itemId: 'item-1',
      createdAt: new Date('2024-01-01'),
    },
  ],
  _count: {
    likes: 5,
    comments: 3,
  },
};

export const mockItems = [
  mockItem,
  {
    ...mockItem,
    id: 'item-2',
    title: 'Test Item 2',
    userId: 'user-2',
  },
];

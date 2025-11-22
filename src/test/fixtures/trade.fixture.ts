import { TradeStatus } from '@prisma/client';

/**
 * Mock trade for testing
 */
export const mockTrade = {
  id: 'trade-123',
  status: TradeStatus.PENDING,
  proposerId: 'user-123',
  responderId: 'user-456',
  itemOfferedId: 'item-123',
  itemRequestedId: 'item-456',
  message: 'Would love to trade!',
  createdAt: new Date('2024-11-22T10:00:00Z'),
  updatedAt: new Date('2024-11-22T10:00:00Z'),
  completedAt: null,
};

/**
 * Mock trade with full user and item relations
 */
export const mockTradeWithRelations = {
  ...mockTrade,
  proposer: {
    id: 'user-123',
    username: 'proposer',
    avatarUrl: 'https://cloudinary.com/proposer.jpg',
  },
  responder: {
    id: 'user-456',
    username: 'responder',
    avatarUrl: 'https://cloudinary.com/responder.jpg',
  },
  itemOffered: {
    id: 'item-123',
    title: 'Nintendo Switch',
    images: [{ url: 'https://cloudinary.com/switch.jpg' }],
  },
  itemRequested: {
    id: 'item-456',
    title: 'Pokemon Cards',
    images: [{ url: 'https://cloudinary.com/cards.jpg' }],
  },
};

/**
 * Mock accepted trade
 */
export const mockAcceptedTrade = {
  ...mockTradeWithRelations,
  status: TradeStatus.ACCEPTED,
  completedAt: new Date('2024-11-22T15:00:00Z'),
};

/**
 * Mock rejected trade
 */
export const mockRejectedTrade = {
  ...mockTradeWithRelations,
  status: TradeStatus.REJECTED,
};

/**
 * Mock cancelled trade
 */
export const mockCancelledTrade = {
  ...mockTradeWithRelations,
  status: TradeStatus.CANCELLED,
};

/**
 * Array of mock trades
 */
export const mockTrades = [
  mockTradeWithRelations,
  {
    ...mockTradeWithRelations,
    id: 'trade-456',
    status: TradeStatus.ACCEPTED,
    completedAt: new Date('2024-11-21T10:00:00Z'),
  },
];

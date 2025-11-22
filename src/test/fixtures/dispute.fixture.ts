import { DisputeReason, DisputeStatus } from '@prisma/client';

export const mockDispute = {
  id: 'dispute-123',
  tradeId: 'trade-1',
  reporterId: 'user-1',
  reportedUserId: 'user-2',
  reason: DisputeReason.ITEM_NOT_AS_DESCRIBED,
  description: 'The item was not as described.',
  status: DisputeStatus.OPEN,
  adminId: null,
  adminNotes: null,
  resolution: null,
  resolvedAt: null,
  createdAt: new Date('2024-11-20T10:00:00Z'),
  updatedAt: new Date('2024-11-20T10:00:00Z'),
};

export const mockDisputeWithRelations = {
  ...mockDispute,
  reporter: {
    id: 'user-1',
    username: 'reporter_user',
  },
  reportedUser: {
    id: 'user-2',
    username: 'reported_user',
  },
  admin: null,
};

export const mockResolvedDispute = {
  ...mockDispute,
  status: DisputeStatus.RESOLVED,
  adminId: 'admin-1',
  adminNotes: 'Investigated the case thoroughly.',
  resolution: 'Trade cancelled. Refund processed.',
  resolvedAt: new Date('2024-11-22T15:00:00Z'),
  updatedAt: new Date('2024-11-22T15:00:00Z'),
};

export const mockResolvedDisputeWithRelations = {
  ...mockResolvedDispute,
  reporter: {
    id: 'user-1',
    username: 'reporter_user',
  },
  reportedUser: {
    id: 'user-2',
    username: 'reported_user',
  },
  admin: {
    id: 'admin-1',
    username: 'admin_user',
  },
};

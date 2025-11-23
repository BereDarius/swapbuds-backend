export const mockTradesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  accept: jest.fn(),
  reject: jest.fn(),
  cancel: jest.fn(),
  getTradesByUser: jest.fn(),
  getTradesByItem: jest.fn(),
  proposeCounterOffer: jest.fn(),
  getCounterOffers: jest.fn(),
  acceptCounterOffer: jest.fn(),
  rejectCounterOffer: jest.fn(),
  getCounterOffer: jest.fn(),
  createTrade: jest.fn(),
  getUserTrades: jest.fn(),
  getUserTradesFiltered: jest.fn(),
  getTradeById: jest.fn(),
  acceptTrade: jest.fn(),
  rejectTrade: jest.fn(),
  cancelTrade: jest.fn(),
  createCounterOffer: jest.fn(),
  getTradeCounterOffers: jest.fn(),
};

export const mockTradeExpirationService = {
  scheduleExpiration: jest.fn(),
  cancelExpiration: jest.fn(),
  checkExpiredTrades: jest.fn(),
  sendExpirationWarnings: jest.fn(),
  calculateExpirationDate: jest
    .fn()
    .mockReturnValue(new Date('2024-11-25T10:30:00Z')),
  getExpirationConfig: jest.fn().mockReturnValue({
    expirationHours: 72,
    notificationHoursBefore: 24,
  }),
  handleTradeExpiration: jest.fn(),
  handleExpirationWarnings: jest.fn(),
};

export function resetTradesServiceMocks() {
  Object.values(mockTradesService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockTradeExpirationService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

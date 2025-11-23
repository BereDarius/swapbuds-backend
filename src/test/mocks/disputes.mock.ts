export const mockDisputesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  resolve: jest.fn(),
  close: jest.fn(),
  getDisputesByUser: jest.fn(),
  getDisputesByTrade: jest.fn(),
  createDispute: jest.fn(),
  getUserDisputes: jest.fn(),
  getDispute: jest.fn(),
  getAllDisputes: jest.fn(),
  assignDispute: jest.fn(),
  resolveDispute: jest.fn(),
  closeDispute: jest.fn(),

  addEvidence: jest.fn(),
};

export function resetDisputesServiceMocks() {
  Object.values(mockDisputesService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

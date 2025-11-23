export const mockItemsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findAllFiltered: jest.fn(),
  findByUser: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getUserItems: jest.fn(),
  searchItems: jest.fn(),
};

export const resetItemsMocks = () => {
  Object.values(mockItemsService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

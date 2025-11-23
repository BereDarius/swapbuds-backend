export const mockLikesService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  remove: jest.fn(),
  findByItem: jest.fn(),
  findByUser: jest.fn(),
  hasUserLikedItem: jest.fn(),
  getLikesCount: jest.fn(),
  likeItem: jest.fn(),
  unlikeItem: jest.fn(),
  getUsersWhoLiked: jest.fn(),
};

export function resetLikesServiceMocks() {
  Object.values(mockLikesService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

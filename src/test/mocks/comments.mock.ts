export const mockCommentsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  findByItem: jest.fn(),
  findByUser: jest.fn(),
  createComment: jest.fn(),
  getItemComments: jest.fn(),
  updateComment: jest.fn(),
  deleteComment: jest.fn(),
  getCommentsCount: jest.fn(),
  likeComment: jest.fn(),
  unlikeComment: jest.fn(),
  hasLikedComment: jest.fn(),
  getCommentVersions: jest.fn(),
};

export function resetCommentsServiceMocks() {
  Object.values(mockCommentsService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

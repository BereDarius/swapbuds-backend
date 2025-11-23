export const mockReviewsService = {
  createReview: jest.fn(),
  getUserReviews: jest.fn(),
  getUserReviewsGiven: jest.fn(),
  getReviewById: jest.fn(),
  updateReview: jest.fn(),
  deleteReview: jest.fn(),
  getTradeReviews: jest.fn(),
  getAverageRating: jest.fn(),
};

export const resetReviewsMocks = () => {
  Object.values(mockReviewsService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

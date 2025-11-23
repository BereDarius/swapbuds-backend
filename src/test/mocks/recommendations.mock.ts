export const mockRecommendationsService = {
  getRecommendations: jest.fn(),
  getSimilarItems: jest.fn(),
  getPersonalizedRecommendations: jest.fn(),
  getTrendingItems: jest.fn(),
};

export const resetRecommendationsMocks = () => {
  Object.values(mockRecommendationsService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

export const mockMailerService = {
  sendMail: jest.fn(),
};

export function resetMailerServiceMocks() {
  Object.values(mockMailerService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

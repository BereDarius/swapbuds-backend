export const mockMessagesService = {
  sendMessage: jest.fn(),
  getConversations: jest.fn(),
  getMessages: jest.fn(),
  markAsRead: jest.fn(),
  deleteMessage: jest.fn(),
  getConversation: jest.fn(),
  createConversation: jest.fn(),
  markConversationAsRead: jest.fn(),
  getUnreadCount: jest.fn(),
};

export function resetMessagesServiceMocks() {
  Object.values(mockMessagesService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

export const mockSupportChatService = {
  createChat: jest.fn(),
  getChat: jest.fn(),
  getUserChats: jest.fn(),
  getAgentChats: jest.fn(),
  sendMessage: jest.fn(),
  assignToAgent: jest.fn(),
  resolveChat: jest.fn(),
  closeChat: jest.fn(),
  transferChat: jest.fn(),
  getChatStats: jest.fn(),
  getSupportStats: jest.fn(),

  getUnassignedChats: jest.fn(),
};

export const mockSupportChatGateway = {
  handleConnection: jest.fn(),
  handleDisconnect: jest.fn(),
  joinChatRoom: jest.fn(),
  leaveChatRoom: jest.fn(),
  sendChatMessage: jest.fn(),
  notifyAgents: jest.fn(),
  server: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  },
};

export const mockSupportQueueService = {
  addToQueue: jest.fn(),
  removeFromQueue: jest.fn(),
  getNextInQueue: jest.fn(),
  getQueuePosition: jest.fn(),
  getQueueLength: jest.fn(),
  clearQueue: jest.fn(),
  getQueueStats: jest.fn(),
  autoAssignChats: jest.fn(),
};

export const mockSupportCronService = {
  handleAutoAssignment: jest.fn(),
  handleInactiveChats: jest.fn(),
  handleMetricsCollection: jest.fn(),
};

export function resetSupportServiceMocks() {
  Object.values(mockSupportChatService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockSupportChatGateway).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  if (mockSupportChatGateway.server) {
    Object.values(mockSupportChatGateway.server).forEach((mock) => {
      if (jest.isMockFunction(mock)) {
        mock.mockReset();
      }
    });
  }
  Object.values(mockSupportQueueService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockSupportCronService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

export const mockNotificationsGateway = {
  server: {
    emit: jest.fn(),
    to: jest.fn().mockReturnThis(),
  },
  sendNotificationToUser: jest.fn(),
  emitNotificationToUser: jest.fn(),
  emitNotificationRead: jest.fn(),
  emitAllNotificationsRead: jest.fn(),
  emitNotificationDeleted: jest.fn(),
  handleConnection: jest.fn(),
  handleDisconnect: jest.fn(),
  emitToUser: jest.fn(),
  emitMessageToUser: jest.fn(),
  emitMessageRead: jest.fn(),
  emitConversationRead: jest.fn(),
  emitMessageDeleted: jest.fn(),
  emitTyping: jest.fn(),
};

export const resetNotificationsGatewayMocks = () => {
  mockNotificationsGateway.sendNotificationToUser.mockReset();
  mockNotificationsGateway.emitNotificationToUser.mockReset();
  mockNotificationsGateway.emitNotificationRead.mockReset();
  mockNotificationsGateway.emitAllNotificationsRead.mockReset();
  mockNotificationsGateway.emitNotificationDeleted.mockReset();
  mockNotificationsGateway.handleConnection.mockReset();
  mockNotificationsGateway.handleDisconnect.mockReset();
  mockNotificationsGateway.emitToUser.mockReset();
  mockNotificationsGateway.server.emit.mockReset();
  mockNotificationsGateway.server.to.mockClear().mockReturnThis();
};

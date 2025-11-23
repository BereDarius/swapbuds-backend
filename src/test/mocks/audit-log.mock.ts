export const mockAuditLogService = {
  log: jest.fn(),
  getLogs: jest.fn(),
  getUserLogs: jest.fn(),
  getLogsByAction: jest.fn(),
  deleteOldLogs: jest.fn(),
  getAuditLogs: jest.fn(),
  getAuditStats: jest.fn(),
  getLogsForTarget: jest.fn(),
};

export const resetAuditLogMocks = () => {
  Object.values(mockAuditLogService).forEach((mock) => {
    if (typeof mock === 'function' && 'mockReset' in mock) {
      mock.mockReset();
    }
  });
};

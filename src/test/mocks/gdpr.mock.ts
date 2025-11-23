export const mockDataExportService = {
  exportUserData: jest.fn(),
  generateExportFile: jest.fn(),
  getExportStatus: jest.fn(),
  generateExport: jest.fn(),
  getExport: jest.fn(),
};

export const mockDataDeletionService = {
  deleteUserData: jest.fn(),
  scheduleDataDeletion: jest.fn(),
  cancelDataDeletion: jest.fn(),
  getDeletionStatus: jest.fn(),
  requestDeletion: jest.fn(),
  cancelDeletion: jest.fn(),
};

export const mockGdprService = {
  requestDataExport: jest.fn(),
  requestDataDeletion: jest.fn(),
  getDataExportStatus: jest.fn(),
  getDataDeletionStatus: jest.fn(),
};

export function resetGdprServiceMocks() {
  Object.values(mockDataExportService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockDataDeletionService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
  Object.values(mockGdprService).forEach((mock) => {
    if (jest.isMockFunction(mock)) {
      mock.mockReset();
    }
  });
}

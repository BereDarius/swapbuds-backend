import { Test, TestingModule } from '@nestjs/testing';
import { SupportCronService } from './support-cron.service';
import { SupportQueueService } from './support-queue.service';

describe('SupportCronService', () => {
  let service: SupportCronService;

  const mockQueueService = {
    autoAssignChats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportCronService,
        {
          provide: SupportQueueService,
          useValue: mockQueueService,
        },
      ],
    }).compile();

    service = module.get<SupportCronService>(SupportCronService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('autoAssignChats', () => {
    it('should call queueService.autoAssignChats and log count', async () => {
      const logSpy = jest.spyOn(service['logger'], 'log');
      mockQueueService.autoAssignChats.mockResolvedValue(3);

      await service.autoAssignChats();

      expect(mockQueueService.autoAssignChats).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Auto-assigned 3 support chats');
    });

    it('should log error if auto-assignment fails', async () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const testError = new Error('Assignment failed');
      mockQueueService.autoAssignChats.mockRejectedValue(testError);

      await service.autoAssignChats();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to auto-assign chats:',
        testError,
      );
    });

    it('should not throw when assignment fails', async () => {
      mockQueueService.autoAssignChats.mockRejectedValue(new Error('Failed'));

      await expect(service.autoAssignChats()).resolves.not.toThrow();
    });
  });
});

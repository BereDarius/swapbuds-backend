import { SupportQueueService } from '@/support/support-queue.service';
import { mockSupportQueueService } from '@/test/mocks/support.mock';
import { Test, TestingModule } from '@nestjs/testing';
import { SupportCronService } from './support-cron.service';

describe('SupportCronService', () => {
  let service: SupportCronService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportCronService,
        {
          provide: SupportQueueService,
          useValue: mockSupportQueueService,
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
      mockSupportQueueService.autoAssignChats.mockResolvedValue(3);

      await service.autoAssignChats();

      expect(mockSupportQueueService.autoAssignChats).toHaveBeenCalled();
      expect(logSpy).toHaveBeenCalledWith('Auto-assigned 3 support chats');
    });

    it('should log error if auto-assignment fails', async () => {
      const errorSpy = jest.spyOn(service['logger'], 'error');
      const testError = new Error('Assignment failed');
      mockSupportQueueService.autoAssignChats.mockRejectedValue(testError);

      await service.autoAssignChats();

      expect(errorSpy).toHaveBeenCalledWith(
        'Failed to auto-assign chats:',
        testError,
      );
    });

    it('should not throw when assignment fails', async () => {
      mockSupportQueueService.autoAssignChats.mockRejectedValue(
        new Error('Failed'),
      );

      await expect(service.autoAssignChats()).resolves.not.toThrow();
    });
  });
});

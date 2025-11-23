import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { SupportQueueService } from './support-queue.service';

@Injectable()
export class SupportCronService {
  private readonly logger = new Logger(SupportCronService.name);

  constructor(private queueService: SupportQueueService) {}

  /**
   * Auto-assign waiting chats to available agents every 30 seconds
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async autoAssignChats() {
    try {
      const assignedCount = await this.queueService.autoAssignChats();

      if (assignedCount > 0) {
        this.logger.log(`Auto-assigned ${assignedCount} support chats`);
      }
    } catch (error) {
      this.logger.error('Failed to auto-assign chats:', error);
    }
  }
}

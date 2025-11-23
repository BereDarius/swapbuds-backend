import { AuthModule } from '@/auth/auth.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { SupportChatController } from './support-chat.controller';
import { SupportChatGateway } from './support-chat.gateway';
import { SupportChatService } from './support-chat.service';
import { SupportCronService } from './support-cron.service';
import { SupportQueueService } from './support-queue.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SupportChatController],
  providers: [
    SupportChatService,
    SupportQueueService,
    SupportChatGateway,
    SupportCronService,
  ],
  exports: [SupportChatService, SupportQueueService, SupportChatGateway],
})
export class SupportModule {}

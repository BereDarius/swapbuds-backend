import { WsJwtGuard } from '@/auth/guards/ws-jwt.guard';
import { NotificationsModule } from '@/notifications/notifications.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MessagesController } from './messages.controller';
import { MessagesGateway } from './messages.gateway';
import { MessagesService } from './messages.service';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default-secret',
    }),
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, WsJwtGuard],
  exports: [MessagesService, MessagesGateway],
})
export class MessagesModule {}

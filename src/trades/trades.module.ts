import { NotificationsModule } from '@/notifications/notifications.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { TradeExpirationService } from './trade-expiration.service';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';

/**
 * Module for managing trade functionality
 * Handles trade proposals, acceptance, rejection, and cancellation
 * Includes automatic expiration handling
 */
@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [TradesService, TradeExpirationService],
  controllers: [TradesController],
  exports: [TradesService, TradeExpirationService],
})
export class TradesModule {}

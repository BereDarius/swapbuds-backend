import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { TradesController } from './trades.controller';
import { TradesService } from './trades.service';

/**
 * Module for managing trade functionality
 * Handles trade proposals, acceptance, rejection, and cancellation
 */
@Module({
  imports: [PrismaModule],
  providers: [TradesService],
  controllers: [TradesController],
  exports: [TradesService],
})
export class TradesModule {}

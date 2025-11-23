import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { DataDeletionService } from './data-deletion.service';
import { DataExportService } from './data-export.service';
import { GdprController } from './gdpr.controller';
import { GdprService } from './gdpr.service';

@Module({
  imports: [PrismaModule],
  controllers: [GdprController],
  providers: [GdprService, DataExportService, DataDeletionService],
  exports: [GdprService, DataExportService, DataDeletionService],
})
export class GdprModule {}

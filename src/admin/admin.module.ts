import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminGateway } from './admin.gateway';
import { AdminService } from './admin.service';
import { AuditLogService } from './audit-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [AdminController],
  providers: [AdminService, AuditLogService, AdminGateway],
  exports: [AdminService, AuditLogService, AdminGateway],
})
export class AdminModule {}

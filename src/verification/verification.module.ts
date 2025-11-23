import { AdminGuard } from '@/auth/guards/admin.guard';
import { MailModule } from '@/mail/mail.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { Module } from '@nestjs/common';
import { DocumentSecurityService } from './document-security.service';
import { VerificationAuditService } from './verification-audit.service';
import { VerificationCleanupService } from './verification-cleanup.service';
import { VerificationRateLimitService } from './verification-rate-limit.service';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';

/**
 * Verification module
 * Handles user ID verification and age verification
 * Includes security features: encryption, rate limiting, audit logging, auto-deletion
 */
@Module({
  imports: [MailModule, NotificationsModule],
  controllers: [VerificationController],
  providers: [
    VerificationService,
    AdminGuard,
    DocumentSecurityService,
    VerificationAuditService,
    VerificationRateLimitService,
    VerificationCleanupService,
  ],
  exports: [VerificationService],
})
export class VerificationModule {}

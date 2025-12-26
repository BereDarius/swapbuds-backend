import { MailModule } from '@/mail/mail.module';
import { PrismaModule } from '@/prisma/prisma.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminInviteController } from './admin-invite.controller';
import { AdminInviteService } from './admin-invite.service';
import { PermissionsController } from './permissions.controller';
import { PermissionsService } from './permissions.service';
import { AdminJwtStrategy } from './strategies/admin-jwt.strategy';

/**
 * Admin Authentication Module
 *
 * Provides admin-specific authentication with separate JWT strategy.
 * Includes granular permissions system for MODERATOR and SUPPORT roles.
 * Includes admin invitation system with approval workflow.
 * Completely isolated from regular user authentication.
 */
@Module({
  imports: [
    PrismaModule,
    MailModule,
    PassportModule.register({ defaultStrategy: 'admin-jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get('jwt.adminSecret') ||
          configService.get('jwt.secret'),
        signOptions: {
          expiresIn: '8h', // Shorter expiration for admin tokens
        },
      }),
    }),
  ],
  controllers: [
    AdminAuthController,
    PermissionsController,
    AdminInviteController,
  ],
  providers: [
    AdminAuthService,
    AdminJwtStrategy,
    PermissionsService,
    AdminInviteService,
  ],
  exports: [AdminAuthService, PermissionsService, AdminInviteService],
})
export class AdminAuthModule {}

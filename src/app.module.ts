import { AuthModule } from '@/auth/auth.module';
import configuration from '@/config/configuration';
import { PrismaModule } from '@/prisma/prisma.module';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';
import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-yet';
import Redis from 'ioredis';
import { AdminModule } from './admin/admin.module';
import { CacheModule as AppCacheModule } from './cache/cache.module';
import { CommentsModule } from './comments/comments.module';
import { DisputesModule } from './disputes/disputes.module';
import { GdprModule } from './gdpr/gdpr.module';
import { HealthModule } from './health/health.module';
import { ItemsModule } from './items/items.module';
import { LegalModule } from './legal/legal.module';
import { LikesModule } from './likes/likes.module';
import { MailModule } from './mail/mail.module';
import { MessagesModule } from './messages/messages.module';
import { ModerationModule } from './moderation/moderation.module';
import { MonitoringInterceptor } from './monitoring/monitoring.interceptor';
import { MonitoringModule } from './monitoring/monitoring.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { SupportModule } from './support/support.module';
import { TradesModule } from './trades/trades.module';
import { UploadModule } from './upload/upload.module';
import { UsersModule } from './users/users.module';
import { VerificationModule } from './verification/verification.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: '.env',
    }),

    // Schedule Module for Cron Jobs
    ScheduleModule.forRoot(),

    // Rate Limiting with Redis
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get('throttle.ttl'),
            limit: config.get('throttle.limit'),
          },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis(config.get('redis.url')),
        ),
      }),
    }),

    // Caching with Redis
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const redisUrl = configService.get('redis.url');

        return {
          store: await redisStore({
            url: redisUrl,
            ttl: 60000, // 1 minute default
          }),
        };
      },
    }),

    // Database
    PrismaModule,

    // Cache Service (Global)
    AppCacheModule,

    // Health Checks
    HealthModule,

    // Monitoring (Global)
    MonitoringModule,

    // Auth
    AuthModule,

    ItemsModule,

    UploadModule,

    UsersModule,

    LikesModule,

    CommentsModule,

    TradesModule,

    ReviewsModule,

    NotificationsModule,

    MailModule,

    MessagesModule,

    DisputesModule,

    VerificationModule,

    AdminModule,

    ModerationModule,

    SupportModule,

    GdprModule,

    LegalModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: MonitoringInterceptor,
    },
  ],
})
export class AppModule {}

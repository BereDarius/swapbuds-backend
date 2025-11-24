import { AuthController } from '@/auth/auth.controller';
import { AuthService } from '@/auth/auth.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { MFAService } from '@/auth/mfa.service';
import { OAuthService } from '@/auth/oauth.service';
import { AppleStrategy } from '@/auth/strategies/apple.strategy';
import { FacebookStrategy } from '@/auth/strategies/facebook.strategy';
import { GoogleStrategy } from '@/auth/strategies/google.strategy';
import { JwtStrategy } from '@/auth/strategies/jwt.strategy';
import { RecaptchaModule } from '@/recaptcha/recaptcha.module';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('jwt.secret'),
        signOptions: {
          expiresIn: configService.get('jwt.expiresIn'),
        },
      }),
    }),
    RecaptchaModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    MFAService,
    OAuthService,
    JwtStrategy,
    GoogleStrategy,
    FacebookStrategy,
    AppleStrategy,
    JwtAuthGuard,
  ],
  exports: [AuthService, MFAService, OAuthService, JwtAuthGuard, JwtModule],
})
export class AuthModule {}

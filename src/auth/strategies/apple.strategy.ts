import { OAuthService } from '@/auth/oauth.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { OAuthProvider } from '@prisma/client';
import { Strategy, VerifyCallback } from 'passport-apple';

@Injectable()
export class AppleStrategy extends PassportStrategy(Strategy, 'apple') {
  constructor(
    private configService: ConfigService,
    private oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get('oauth.apple.clientId'),
      teamID: configService.get('oauth.apple.teamId'),
      keyID: configService.get('oauth.apple.keyId'),
      key: configService.get('oauth.apple.privateKey'),
      callbackURL: configService.get('oauth.apple.callbackUrl'),
      scope: ['email', 'name'],
      passReqToCallback: false,
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { sub, email, name } = profile;

    const oauthData = {
      provider: OAuthProvider.APPLE,
      providerId: sub,
      email: email || `${sub}@privaterelay.appleid.com`,
      name: name?.firstName
        ? `${name.firstName} ${name.lastName || ''}`.trim()
        : 'Apple User',
      picture: undefined,
      accessToken,
      refreshToken,
    };

    const result = await this.oauthService.handleOAuthCallback(oauthData);

    done(null, result);
  }
}

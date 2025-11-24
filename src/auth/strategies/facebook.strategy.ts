import { OAuthService } from '@/auth/oauth.service';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { OAuthProvider } from '@prisma/client';
import { Strategy } from 'passport-facebook';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private configService: ConfigService,
    private oauthService: OAuthService,
  ) {
    super({
      clientID: configService.get('oauth.facebook.appId'),
      clientSecret: configService.get('oauth.facebook.appSecret'),
      callbackURL: configService.get('oauth.facebook.callbackUrl'),
      profileFields: ['id', 'emails', 'name', 'photos'],
      scope: ['email', 'public_profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: (error: any, user?: any) => void,
  ): Promise<any> {
    const { id, emails, displayName, photos } = profile;

    const oauthData = {
      provider: OAuthProvider.FACEBOOK,
      providerId: id,
      email: emails?.[0]?.value || `${id}@facebook.com`,
      name: displayName,
      picture: photos?.[0]?.value,
      accessToken,
      refreshToken,
    };

    const result = await this.oauthService.handleOAuthCallback(oauthData);

    done(null, result);
  }
}

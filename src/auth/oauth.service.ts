import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { OAuthProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { OAuthAccountResponseDto, OAuthCallbackDto } from './dto/oauth.dto';

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Handle OAuth callback - login or create account
   */
  async handleOAuthCallback(oauthData: OAuthCallbackDto) {
    const {
      provider,
      providerId,
      email,
      name,
      picture,
      accessToken,
      refreshToken,
    } = oauthData;

    // Check if OAuth account already exists
    const existingOAuthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
      include: {
        user: true,
      },
    });

    if (existingOAuthAccount) {
      // Update OAuth account with latest data
      await this.prisma.oAuthAccount.update({
        where: { id: existingOAuthAccount.id },
        data: {
          email,
          name,
          picture,
          accessToken: accessToken
            ? await this.encryptToken(accessToken)
            : null,
          refreshToken: refreshToken
            ? await this.encryptToken(refreshToken)
            : null,
        },
      });

      // Update user last login
      await this.prisma.user.update({
        where: { id: existingOAuthAccount.userId },
        data: { lastLoginAt: new Date() },
      });

      this.logger.log(
        `OAuth login for existing user ${existingOAuthAccount.userId} via ${provider}`,
      );

      return {
        user: existingOAuthAccount.user,
        isNewUser: false,
      };
    }

    // Check if user exists with this email
    let user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      // User exists, link OAuth account
      await this.prisma.oAuthAccount.create({
        data: {
          userId: user.id,
          provider,
          providerId,
          email,
          name,
          picture,
          accessToken: accessToken
            ? await this.encryptToken(accessToken)
            : null,
          refreshToken: refreshToken
            ? await this.encryptToken(refreshToken)
            : null,
        },
      });

      this.logger.log(
        `OAuth account ${provider} linked to existing user ${user.id}`,
      );

      return {
        user,
        isNewUser: false,
        linkedAccount: true,
      };
    }

    // Create new user with OAuth account
    const username = await this.generateUniqueUsername(email, name);
    const randomPassword = await bcrypt.hash(
      Math.random().toString(36).substring(7),
      10,
    );

    user = await this.prisma.user.create({
      data: {
        email,
        username,
        password: randomPassword,
        avatarUrl: picture,
        isVerified: true, // OAuth emails are pre-verified
        oauthAccounts: {
          create: {
            provider,
            providerId,
            email,
            name,
            picture,
            accessToken: accessToken
              ? await this.encryptToken(accessToken)
              : null,
            refreshToken: refreshToken
              ? await this.encryptToken(refreshToken)
              : null,
          },
        },
      },
    });

    this.logger.log(`New user created via ${provider} OAuth: ${user.id}`);

    return {
      user,
      isNewUser: true,
    };
  }

  /**
   * Generate JWT token for OAuth user
   */
  async generateOAuthToken(userId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, username: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Link OAuth account to existing user
   */
  async linkOAuthAccount(
    userId: string,
    password: string,
    oauthData: OAuthCallbackDto,
  ) {
    // Verify user password
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    const {
      provider,
      providerId,
      email,
      name,
      picture,
      accessToken,
      refreshToken,
    } = oauthData;

    // Check if OAuth account is already linked to another user
    const existingOAuthAccount = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerId: {
          provider,
          providerId,
        },
      },
    });

    if (existingOAuthAccount && existingOAuthAccount.userId !== userId) {
      throw new BadRequestException(
        'This OAuth account is already linked to another user',
      );
    }

    if (existingOAuthAccount && existingOAuthAccount.userId === userId) {
      throw new BadRequestException(
        'This OAuth account is already linked to your account',
      );
    }

    // Create OAuth account link
    const oauthAccount = await this.prisma.oAuthAccount.create({
      data: {
        userId,
        provider,
        providerId,
        email,
        name,
        picture,
        accessToken: accessToken ? await this.encryptToken(accessToken) : null,
        refreshToken: refreshToken
          ? await this.encryptToken(refreshToken)
          : null,
      },
    });

    this.logger.log(`OAuth account ${provider} linked to user ${userId}`);

    return oauthAccount;
  }

  /**
   * Unlink OAuth account from user
   */
  async unlinkOAuthAccount(
    userId: string,
    provider: OAuthProvider,
    password: string,
  ) {
    // Verify user password
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { oauthAccounts: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check if user has a password (can't unlink if OAuth is only auth method and no password set)
    if (!user.password && user.oauthAccounts.length === 1) {
      throw new BadRequestException(
        'Cannot unlink the only authentication method. Please set a password first.',
      );
    }

    // Find and delete OAuth account
    const oauthAccount = await this.prisma.oAuthAccount.findFirst({
      where: {
        userId,
        provider,
      },
    });

    if (!oauthAccount) {
      throw new BadRequestException('OAuth account not found');
    }

    await this.prisma.oAuthAccount.delete({
      where: { id: oauthAccount.id },
    });

    this.logger.log(`OAuth account ${provider} unlinked from user ${userId}`);

    return true;
  }

  /**
   * Get user's linked OAuth accounts
   */
  async getLinkedAccounts(userId: string): Promise<OAuthAccountResponseDto[]> {
    const oauthAccounts = await this.prisma.oAuthAccount.findMany({
      where: { userId },
      select: {
        id: true,
        provider: true,
        email: true,
        name: true,
        picture: true,
        createdAt: true,
      },
    });

    return oauthAccounts;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Generate unique username from email or name
   */
  private async generateUniqueUsername(
    email: string,
    name?: string,
  ): Promise<string> {
    let baseUsername = name
      ? name.toLowerCase().replace(/\s+/g, '_')
      : email.split('@')[0];

    // Remove special characters
    baseUsername = baseUsername.replace(/[^a-z0-9_]/g, '');

    // Check if username exists
    let username = baseUsername;
    let counter = 1;

    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  /**
   * Encrypt OAuth token (simple encryption - in production use stronger encryption)
   */
  private async encryptToken(token: string): Promise<string> {
    // For production, use proper encryption like crypto.subtle or a library
    return Buffer.from(token).toString('base64');
  }

  /**
   * Decrypt OAuth token
   */
  private async decryptToken(encryptedToken: string): Promise<string> {
    // For production, use proper decryption
    return Buffer.from(encryptedToken, 'base64').toString('utf-8');
  }
}

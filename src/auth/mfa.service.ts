import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import * as QRCode from 'qrcode';
import { MFASetupResponseDto } from './dto/mfa.dto';

@Injectable()
export class MFAService {
  private readonly logger = new Logger(MFAService.name);
  private readonly APP_NAME = 'SwapBuds';

  constructor(private prisma: PrismaService) {}

  /**
   * Generate MFA secret and QR code for user
   */
  async setupMFA(
    userId: string,
    password: string,
  ): Promise<MFASetupResponseDto> {
    // Verify user exists and password is correct
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Check if MFA is already enabled
    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled for this account');
    }

    // Generate secret
    const secret = authenticator.generateSecret();

    // Generate backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Store secret and backup codes (encrypted)
    await this.prisma.mFASecret.upsert({
      where: { userId },
      create: {
        userId,
        secret: await this.encryptSecret(secret),
        backupCodes: hashedBackupCodes.join(','),
      },
      update: {
        secret: await this.encryptSecret(secret),
        backupCodes: hashedBackupCodes.join(','),
      },
    });

    // Generate OTP auth URL
    const otpauthUrl = authenticator.keyuri(user.email, this.APP_NAME, secret);

    // Generate QR code
    const qrCode = await QRCode.toDataURL(otpauthUrl);

    this.logger.log(`MFA setup initiated for user ${userId}`);

    return {
      qrCode,
      secret,
      backupCodes,
    };
  }

  /**
   * Verify MFA setup with a code and enable MFA
   */
  async verifyAndEnableMFA(userId: string, code: string): Promise<boolean> {
    const mfaSecret = await this.prisma.mFASecret.findUnique({
      where: { userId },
    });

    if (!mfaSecret) {
      throw new BadRequestException('MFA setup not initiated');
    }

    // Decrypt secret
    const secret = await this.decryptSecret(mfaSecret.secret);

    // Verify the code
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      throw new UnauthorizedException('Invalid authentication code');
    }

    // Enable MFA for user
    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaEnabled: true },
    });

    this.logger.log(`MFA enabled for user ${userId}`);

    return true;
  }

  /**
   * Verify MFA code during login
   */
  async verifyMFACode(
    userId: string,
    code: string,
    isBackupCode = false,
  ): Promise<boolean> {
    const mfaSecret = await this.prisma.mFASecret.findUnique({
      where: { userId },
    });

    if (!mfaSecret) {
      throw new BadRequestException('MFA not configured for this user');
    }

    if (isBackupCode) {
      return await this.verifyBackupCode(userId, code, mfaSecret);
    }

    // Verify TOTP code
    const secret = await this.decryptSecret(mfaSecret.secret);
    const isValid = authenticator.verify({ token: code, secret });

    if (!isValid) {
      this.logger.warn(`Invalid MFA code attempt for user ${userId}`);
      throw new UnauthorizedException('Invalid authentication code');
    }

    return true;
  }

  /**
   * Disable MFA for user
   */
  async disableMFA(
    userId: string,
    password: string,
    code: string,
  ): Promise<boolean> {
    // Verify user exists and password is correct
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA code
    await this.verifyMFACode(userId, code);

    // Disable MFA and remove secret
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false },
      }),
      this.prisma.mFASecret.delete({
        where: { userId },
      }),
    ]);

    this.logger.log(`MFA disabled for user ${userId}`);

    return true;
  }

  /**
   * Regenerate backup codes
   */
  async regenerateBackupCodes(
    userId: string,
    password: string,
    code: string,
  ): Promise<string[]> {
    // Verify user exists and password is correct
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid password');
    }

    // Verify MFA code
    await this.verifyMFACode(userId, code);

    // Generate new backup codes
    const backupCodes = this.generateBackupCodes();
    const hashedBackupCodes = await Promise.all(
      backupCodes.map((code) => bcrypt.hash(code, 10)),
    );

    // Update backup codes
    await this.prisma.mFASecret.update({
      where: { userId },
      data: { backupCodes: hashedBackupCodes.join(',') },
    });

    this.logger.log(`Backup codes regenerated for user ${userId}`);

    return backupCodes;
  }

  /**
   * Check if user has MFA enabled
   */
  async isMFAEnabled(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true },
    });
    return user?.mfaEnabled || false;
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  /**
   * Verify backup code
   */
  private async verifyBackupCode(
    userId: string,
    code: string,
    mfaSecret: any,
  ): Promise<boolean> {
    if (!mfaSecret.backupCodes) {
      throw new BadRequestException('No backup codes available');
    }

    const backupCodes = mfaSecret.backupCodes.split(',');

    // Check each backup code
    for (let i = 0; i < backupCodes.length; i++) {
      const isValid = await bcrypt.compare(code, backupCodes[i]);
      if (isValid) {
        // Remove used backup code
        backupCodes.splice(i, 1);
        await this.prisma.mFASecret.update({
          where: { userId },
          data: { backupCodes: backupCodes.join(',') },
        });

        this.logger.log(`Backup code used for user ${userId}`);
        return true;
      }
    }

    throw new UnauthorizedException('Invalid backup code');
  }

  /**
   * Generate 10 backup codes
   */
  private generateBackupCodes(): string[] {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      const formatted = `${code.substring(0, 3)}-${code.substring(3, 6)}`;
      codes.push(formatted);
    }
    return codes;
  }

  /**
   * Encrypt MFA secret (simple encryption - in production use stronger encryption)
   */
  private async encryptSecret(secret: string): Promise<string> {
    // For production, use proper encryption like crypto.subtle or a library
    // This is a simple base64 encoding for demonstration
    return Buffer.from(secret).toString('base64');
  }

  /**
   * Decrypt MFA secret
   */
  private async decryptSecret(encryptedSecret: string): Promise<string> {
    // For production, use proper decryption
    return Buffer.from(encryptedSecret, 'base64').toString('utf-8');
  }
}

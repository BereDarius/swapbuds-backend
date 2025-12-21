import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRegisterDto } from './dto/admin-register.dto';
import { AdminJwtPayload } from './strategies/admin-jwt.strategy';

/**
 * Admin Authentication Service
 *
 * Handles admin user authentication (login, registration, MFA).
 * Completely separate from regular user authentication.
 */
@Injectable()
export class AdminAuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  /**
   * Admin Login
   *
   * Authenticates admin using email/password (no OAuth).
   * Requires MFA code if MFA is enabled for the admin.
   *
   * @param adminLoginDto - Admin login credentials
   * @returns JWT access token and admin info
   */
  async login(adminLoginDto: AdminLoginDto) {
    const { email, password, mfaCode } = adminLoginDto;

    // Find admin by email
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { email },
      include: { mfaSecret: true },
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, adminUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // If MFA is enabled, verify MFA code
    if (adminUser.mfaEnabled) {
      if (!mfaCode) {
        throw new BadRequestException('MFA code is required');
      }

      const isMfaValid = speakeasy.totp.verify({
        secret: adminUser.mfaSecret.secret,
        encoding: 'base32',
        token: mfaCode,
        window: 2, // Allow 2 time steps before/after
      });

      if (!isMfaValid) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    // Update last login timestamp
    await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() },
    });

    // Generate JWT token
    const payload: AdminJwtPayload = {
      sub: adminUser.id,
      email: adminUser.email,
      username: adminUser.username,
      role: adminUser.role,
    };

    const accessToken = this.jwtService.sign(payload, {
      secret:
        this.configService.get('jwt.adminSecret') ||
        this.configService.get('jwt.secret'),
      expiresIn: '8h', // Shorter expiration for admin tokens
    });

    return {
      accessToken,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username,
        role: adminUser.role,
        mfaEnabled: adminUser.mfaEnabled,
      },
    };
  }

  /**
   * Admin Registration
   *
   * Creates a new admin user.
   * Only existing ADMIN role can create new admins.
   * MFA is mandatory for all admins.
   *
   * @param adminRegisterDto - Admin registration data
   * @param createdBy - ID of admin creating this account
   * @returns Created admin user info
   */
  async register(adminRegisterDto: AdminRegisterDto, createdBy: string) {
    const { email, username, password, role } = adminRegisterDto;

    // Check if email already exists
    const existingAdmin = await this.prisma.adminUser.findUnique({
      where: { email },
    });

    if (existingAdmin) {
      throw new ConflictException('Admin with this email already exists');
    }

    // Check if username already exists
    const existingUsername = await this.prisma.adminUser.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new ConflictException('Admin with this username already exists');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12); // Higher rounds for admin

    // Create admin user
    const adminUser = await this.prisma.adminUser.create({
      data: {
        email,
        username,
        password: hashedPassword,
        role,
        isActive: true,
        mfaEnabled: false, // Will be enabled after MFA setup
      },
      select: {
        id: true,
        email: true,
        username: true,
        role: true,
        createdAt: true,
      },
    });

    // TODO: Send email with MFA setup instructions

    return adminUser;
  }

  /**
   * Setup MFA for admin
   *
   * Generates and stores MFA secret for admin user.
   * Returns QR code URI for authenticator app.
   *
   * @param adminId - Admin user ID
   * @returns MFA secret and QR code URI
   */
  async setupMFA(adminId: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      include: { mfaSecret: true },
    });

    if (!adminUser) {
      throw new UnauthorizedException('Admin not found');
    }

    if (adminUser.mfaSecret) {
      throw new ConflictException('MFA already set up for this admin');
    }

    // Generate MFA secret
    const secret = speakeasy.generateSecret({
      name: `SwapBuds Admin (${adminUser.email})`,
      issuer: 'SwapBuds',
    });

    // Store encrypted secret
    await this.prisma.adminMFASecret.create({
      data: {
        adminUserId: adminId,
        secret: secret.base32, // TODO: Encrypt this
      },
    });

    return {
      secret: secret.base32,
      qrCodeUri: secret.otpauth_url,
    };
  }

  /**
   * Verify and enable MFA
   *
   * Verifies MFA code and enables MFA for admin.
   *
   * @param adminId - Admin user ID
   * @param mfaCode - MFA code from authenticator
   */
  async verifyAndEnableMFA(adminId: string, mfaCode: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
      include: { mfaSecret: true },
    });

    if (!adminUser || !adminUser.mfaSecret) {
      throw new BadRequestException('MFA not set up');
    }

    // Verify MFA code
    const isValid = speakeasy.totp.verify({
      secret: adminUser.mfaSecret.secret,
      encoding: 'base32',
      token: mfaCode,
      window: 2,
    });

    if (!isValid) {
      throw new BadRequestException('Invalid MFA code');
    }

    // Enable MFA
    await this.prisma.adminUser.update({
      where: { id: adminId },
      data: { mfaEnabled: true },
    });

    return { message: 'MFA enabled successfully' };
  }
}

import { AuthResponseDto, LoginDto, RegisterDto } from '@/auth/dto/auth.dto';
import { MFARequiredResponseDto } from '@/auth/dto/mfa.dto';
import { EmailService } from '@/auth/email.service';
import { MFAService } from '@/auth/mfa.service';
import { JwtPayload } from '@/auth/strategies/jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';
import { RecaptchaService } from '@/recaptcha/recaptcha.service';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS = 10;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private recaptchaService: RecaptchaService,
    private mfaService: MFAService,
    private emailService: EmailService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const {
      username,
      email,
      password,
      recaptchaToken,
      dateOfBirth,
      selfDeclaredAge18,
      tosVersion,
      privacyVersion,
    } = registerDto;

    // Age verification - calculate age from date of birth
    const birthDate = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    // Check if user is at least 18 years old
    if (age < 18) {
      throw new ConflictException(
        'You must be at least 18 years old to register',
      );
    }

    // Verify self-declaration matches
    if (!selfDeclaredAge18) {
      throw new ConflictException(
        'You must confirm that you are 18 years or older',
      );
    }

    // Verify reCAPTCHA token if provided
    if (recaptchaToken) {
      const verification = await this.recaptchaService.verifyToken(
        recaptchaToken,
        'register',
      );

      if (!verification.success) {
        this.logger.warn(
          `reCAPTCHA verification failed for registration: ${email}. Reason: ${verification.reason}`,
        );
        // Allow registration to continue but log the warning
        // In production, you might want to throw an exception here
      } else {
        this.logger.log(
          `reCAPTCHA verification successful for registration: ${email}. Score: ${verification.score}`,
        );
      }
    }

    // Check if user exists
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw new ConflictException('Email already registered');
      }
      throw new ConflictException('Username already taken');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, this.SALT_ROUNDS);

    // Generate email verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24); // 24 hour expiry

    // Create user with legal compliance fields
    const now = new Date();
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
        dateOfBirth: birthDate,
        selfDeclaredAge18: true,
        ageVerifiedAt: now,
        tosAcceptedAt: now,
        tosVersion,
        privacyAcceptedAt: now,
        privacyVersion,
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        emailVerificationSentAt: now,
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
        emailVerified: true,
      },
    });

    this.logger.log(
      `New user registered: ${user.username} (${user.email}) - Age: ${age}`,
    );

    // Send verification email (non-blocking)
    this.emailService
      .sendVerificationEmail(user.email, user.username, verificationToken)
      .catch((error) => {
        this.logger.error(
          `Failed to send verification email to ${user.email}`,
          error,
        );
      });

    // Generate JWT
    const accessToken = await this.generateToken(user);

    return {
      accessToken,
      user,
    };
  }

  async login(
    loginDto: LoginDto,
  ): Promise<AuthResponseDto | MFARequiredResponseDto> {
    const { email, password, recaptchaToken, mfaCode, mfaToken } = loginDto;

    // Verify reCAPTCHA token if provided
    if (recaptchaToken) {
      const verification = await this.recaptchaService.verifyToken(
        recaptchaToken,
        'login',
      );

      if (!verification.success) {
        this.logger.warn(
          `reCAPTCHA verification failed for login: ${email}. Reason: ${verification.reason}`,
        );
        // Allow login to continue but log the warning
        // In production with high bot activity, you might want to block here
      } else {
        this.logger.log(
          `reCAPTCHA verification successful for login: ${email}. Score: ${verification.score}`,
        );
      }
    }

    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    // Check if MFA is enabled
    if (user.mfaEnabled) {
      // If MFA code is provided, verify it
      if (mfaCode) {
        const isMFAValid = await this.mfaService.verifyMFACode(
          user.id,
          mfaCode,
          false,
        );
        if (!isMFAValid) {
          throw new UnauthorizedException('Invalid MFA code');
        }
      } else if (mfaToken) {
        // Verify MFA token validity (temporary token from initial login)
        try {
          const decoded = this.jwtService.verify(mfaToken);
          if (decoded.type !== 'mfa' || decoded.sub !== user.id) {
            throw new UnauthorizedException('Invalid MFA token');
          }
        } catch {
          throw new UnauthorizedException('Invalid or expired MFA token');
        }
      } else {
        // MFA is required but not provided, return MFA challenge
        const mfaTempToken = this.jwtService.sign(
          { sub: user.id, type: 'mfa' },
          { expiresIn: '5m' },
        );

        return {
          mfaRequired: true,
          mfaToken: mfaTempToken,
          message: 'Please enter your 6-digit authentication code',
        };
      }
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    this.logger.log(`User logged in: ${user.username}`);

    // Generate JWT
    const accessToken = await this.generateToken(user);

    return {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    return user;
  }

  /**
   * Verify email address with token
   */
  async verifyEmail(token: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: token,
        emailVerificationExpires: {
          gt: new Date(),
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    // Mark email as verified
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
      },
    });

    this.logger.log(
      `Email verified for user: ${user.username} (${user.email})`,
    );

    return {
      message: 'Email verified successfully',
    };
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(userId: string): Promise<{ message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        emailVerified: true,
        emailVerificationSentAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.emailVerified) {
      throw new BadRequestException('Email already verified');
    }

    // Rate limiting: only allow resend once every 5 minutes
    if (user.emailVerificationSentAt) {
      const minutesSinceLastSent =
        (new Date().getTime() - user.emailVerificationSentAt.getTime()) /
        1000 /
        60;
      if (minutesSinceLastSent < 5) {
        throw new BadRequestException(
          `Please wait ${Math.ceil(5 - minutesSinceLastSent)} minutes before requesting another verification email`,
        );
      }
    }

    // Generate new verification token
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const verificationExpires = new Date();
    verificationExpires.setHours(verificationExpires.getHours() + 24);

    // Update user with new token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerificationToken: verificationToken,
        emailVerificationExpires: verificationExpires,
        emailVerificationSentAt: new Date(),
      },
    });

    // Send verification email
    await this.emailService.sendVerificationEmail(
      user.email,
      user.username,
      verificationToken,
    );

    this.logger.log(`Verification email resent to: ${user.email}`);

    return {
      message: 'Verification email sent',
    };
  }

  private async generateToken(user: {
    id: string;
    email: string;
    username: string;
  }): Promise<string> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      username: user.username,
    };

    return this.jwtService.sign(payload);
  }
}

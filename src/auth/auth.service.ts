import { AuthResponseDto, LoginDto, RegisterDto } from '@/auth/dto/auth.dto';
import { MFARequiredResponseDto } from '@/auth/dto/mfa.dto';
import { MFAService } from '@/auth/mfa.service';
import { JwtPayload } from '@/auth/strategies/jwt.strategy';
import { PrismaService } from '@/prisma/prisma.service';
import { RecaptchaService } from '@/recaptcha/recaptcha.service';
import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

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
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
      },
    });

    this.logger.log(
      `New user registered: ${user.username} (${user.email}) - Age: ${age}`,
    );

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

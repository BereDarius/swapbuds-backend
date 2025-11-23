import { AuthResponseDto, LoginDto, RegisterDto } from '@/auth/dto/auth.dto';
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
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, email, password, recaptchaToken } = registerDto;

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

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        username: true,
        avatarUrl: true,
      },
    });

    this.logger.log(`New user registered: ${user.username} (${user.email})`);

    // Generate JWT
    const accessToken = await this.generateToken(user);

    return {
      accessToken,
      user,
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password, recaptchaToken } = loginDto;

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

import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Authentication DTOs (Data Transfer Objects)
 *
 * Defines the structure and validation rules for authentication requests/responses.
 * Uses class-validator decorators for automatic validation.
 */

/**
 * Register DTO
 *
 * Data required to create a new user account.
 * Validates username format, email validity, and password strength.
 */
export class RegisterDto {
  @ApiProperty({ example: 'johndoe' }) // Swagger documentation
  @IsString()
  @MinLength(3) // Minimum 3 characters
  @MaxLength(30) // Maximum 30 characters
  @Matches(/^[a-zA-Z0-9_-]+$/, {
    // Only alphanumeric, underscore, and hyphen allowed
    message:
      'Username can only contain letters, numbers, underscores, and hyphens',
  })
  username: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail() // Validates email format
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  @IsString()
  @MinLength(8) // Minimum 8 characters for security
  @MaxLength(128) // Maximum 128 characters
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    // Must contain uppercase, lowercase, and number
    message:
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
  })
  password: string;

  @ApiProperty({
    example: 'google-recaptcha-token-here',
    required: false,
    description: 'Optional reCAPTCHA v3 token for bot protection',
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @ApiProperty({
    example: '1995-06-15',
    description: 'Date of birth (YYYY-MM-DD) for age verification',
  })
  @IsDateString()
  @IsNotEmpty()
  dateOfBirth: string;

  @ApiProperty({
    example: true,
    description: 'Self-declaration that user is 18 years or older',
  })
  @IsBoolean()
  @IsNotEmpty()
  selfDeclaredAge18: boolean;

  @ApiProperty({
    example: '1.0.0',
    description: 'Version of Terms of Service being accepted',
  })
  @IsString()
  @IsNotEmpty()
  tosVersion: string;

  @ApiProperty({
    example: '1.0.0',
    description: 'Version of Privacy Policy being accepted',
  })
  @IsString()
  @IsNotEmpty()
  privacyVersion: string;
}

/**
 * Login DTO
 *
 * Credentials required to authenticate an existing user.
 */
export class LoginDto {
  @ApiProperty({ example: 'john@example.com' })
  @IsEmail() // Validates email format
  email: string;

  @ApiProperty({ example: 'StrongP@ssw0rd!' })
  @IsString()
  password: string; // No validation rules - any string accepted during login

  @ApiProperty({
    example: 'google-recaptcha-token-here',
    required: false,
    description: 'Optional reCAPTCHA v3 token for bot protection',
  })
  @IsOptional()
  @IsString()
  recaptchaToken?: string;

  @ApiProperty({
    example: '123456',
    required: false,
    description: 'MFA code if user has MFA enabled',
  })
  @IsOptional()
  @IsString()
  mfaCode?: string;

  @ApiProperty({
    example: 'tmp_abc123',
    required: false,
    description: 'MFA token from initial login response',
  })
  @IsOptional()
  @IsString()
  mfaToken?: string;
}

/**
 * Auth Response DTO
 *
 * Structure of successful authentication response.
 * Contains JWT token and user information.
 */
export class AuthResponseDto {
  @ApiProperty() // JWT access token for subsequent authenticated requests
  accessToken: string;

  @ApiProperty() // Basic user information (no sensitive data like password)
  user: {
    id: string; // Unique user identifier
    email: string; // User's email address
    username: string; // User's username
    avatarUrl?: string; // Optional profile picture URL
  };
}

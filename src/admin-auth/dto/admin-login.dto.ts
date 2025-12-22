import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

/**
 * Admin Login DTO
 *
 * Validates admin login request data.
 * Admins only use email/password (no OAuth).
 */
export class AdminLoginDto {
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty({ message: 'Email is required' })
  email: string;

  @IsString()
  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  /**
   * Optional MFA code if admin has MFA enabled
   */
  @IsOptional()
  @IsString()
  mfaCode?: string;
}

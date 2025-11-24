import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

/**
 * DTO for enabling MFA
 */
export class EnableMFADto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'MySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * Response DTO for MFA setup
 */
export class MFASetupResponseDto {
  @ApiProperty({
    description: 'QR code as data URL for scanning with authenticator app',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrCode: string;

  @ApiProperty({
    description: 'Secret key (for manual entry in authenticator app)',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'Backup codes for account recovery',
    example: ['123456-789012', '345678-901234'],
    type: [String],
  })
  backupCodes: string[];
}

/**
 * DTO for verifying and confirming MFA setup
 */
export class VerifyMFASetupDto {
  @ApiProperty({
    description: '6-digit code from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

/**
 * DTO for MFA verification during login
 */
export class VerifyMFADto {
  @ApiProperty({
    description: '6-digit code from authenticator app or backup code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiPropertyOptional({
    description: 'Whether this is a backup code',
    example: false,
  })
  @IsOptional()
  isBackupCode?: boolean;
}

/**
 * DTO for disabling MFA
 */
export class DisableMFADto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'MySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Current 6-digit code from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

/**
 * Response indicating MFA is required
 */
export class MFARequiredResponseDto {
  @ApiProperty({
    description: 'Indicates MFA verification is required',
    example: true,
  })
  mfaRequired: boolean;

  @ApiProperty({
    description: 'Temporary token for MFA verification',
    example: 'tmp_abc123def456',
  })
  mfaToken: string;

  @ApiProperty({
    description: 'Message to display',
    example: 'Please enter your 6-digit authentication code',
  })
  message: string;
}

/**
 * DTO for regenerating backup codes
 */
export class RegenerateBackupCodesDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'MySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({
    description: 'Current 6-digit code from authenticator app',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  code: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OAuthProvider } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

/**
 * DTO for OAuth callback data
 */
export class OAuthCallbackDto {
  @ApiProperty({
    description: 'OAuth provider',
    enum: OAuthProvider,
    example: 'GOOGLE',
  })
  @IsEnum(OAuthProvider)
  @IsNotEmpty()
  provider: OAuthProvider;

  @ApiProperty({
    description: 'User ID from OAuth provider',
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  providerId: string;

  @ApiProperty({
    description: 'User email from OAuth provider',
    example: 'user@example.com',
  })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiPropertyOptional({
    description: 'User name from OAuth provider',
    example: 'John Doe',
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({
    description: 'Profile picture URL from OAuth provider',
    example: 'https://example.com/photo.jpg',
  })
  @IsString()
  @IsOptional()
  picture?: string;

  @ApiPropertyOptional({
    description: 'OAuth access token',
  })
  @IsString()
  @IsOptional()
  accessToken?: string;

  @ApiPropertyOptional({
    description: 'OAuth refresh token',
  })
  @IsString()
  @IsOptional()
  refreshToken?: string;
}

/**
 * Response DTO for OAuth account info
 */
export class OAuthAccountResponseDto {
  @ApiProperty({
    description: 'OAuth account ID',
    example: 'clic2rmky00026vzb9fgb14nn',
  })
  id: string;

  @ApiProperty({
    description: 'OAuth provider',
    enum: OAuthProvider,
    example: 'GOOGLE',
  })
  provider: OAuthProvider;

  @ApiProperty({
    description: 'Email from provider',
    example: 'user@example.com',
  })
  email: string;

  @ApiProperty({
    description: 'Name from provider',
    example: 'John Doe',
  })
  name: string;

  @ApiProperty({
    description: 'Profile picture from provider',
    example: 'https://example.com/photo.jpg',
  })
  picture: string;

  @ApiProperty({
    description: 'When this account was linked',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;
}

/**
 * DTO for linking OAuth account to existing user
 */
export class LinkOAuthAccountDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'MySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

/**
 * DTO for unlinking OAuth account
 */
export class UnlinkOAuthAccountDto {
  @ApiProperty({
    description: 'OAuth provider to unlink',
    enum: OAuthProvider,
    example: 'GOOGLE',
  })
  @IsEnum(OAuthProvider)
  @IsNotEmpty()
  provider: OAuthProvider;

  @ApiProperty({
    description: 'User password for verification',
    example: 'MySecurePassword123',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}

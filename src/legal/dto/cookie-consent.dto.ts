import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty } from 'class-validator';

export class CookieConsentDto {
  @ApiProperty({
    description: 'Essential cookies (always required, cannot be disabled)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  essential: boolean;

  @ApiProperty({
    description: 'Functional cookies (user preferences, language)',
    example: true,
  })
  @IsBoolean()
  @IsNotEmpty()
  functional: boolean;

  @ApiProperty({
    description: 'Analytics cookies (Google Analytics, usage tracking)',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  analytics: boolean;

  @ApiProperty({
    description: 'Marketing cookies (not currently used)',
    example: false,
  })
  @IsBoolean()
  @IsNotEmpty()
  marketing: boolean;
}

export interface CookieConsentData extends CookieConsentDto {
  timestamp: Date;
}

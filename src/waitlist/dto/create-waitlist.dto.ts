import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateWaitlistDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email address to add to waitlist',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'landing_page',
    description: 'Source of signup (e.g., landing_page, social_media)',
    required: false,
  })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiProperty({
    example: 'REF123',
    description: 'Optional referral code',
    required: false,
  })
  @IsOptional()
  @IsString()
  referralCode?: string;
}

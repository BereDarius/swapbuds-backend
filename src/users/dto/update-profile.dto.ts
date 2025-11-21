import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

/**
 * DTO for updating user profile
 * All fields are optional - only provided fields will be updated
 */
export class UpdateProfileDto {
  @ApiProperty({
    description: 'User bio/about section',
    example: 'Avid collector of vintage video games and anime merchandise',
    required: false,
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({
    description: 'User location',
    example: 'San Francisco, CA',
    required: false,
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  location?: string;

  @ApiProperty({
    description: 'Avatar URL (use /api/users/avatar endpoint to upload)',
    example: 'https://res.cloudinary.com/...',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}

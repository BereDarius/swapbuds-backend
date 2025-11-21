import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user profile response
 * Public profile information shown to other users
 */
export class UserProfileDto {
  @ApiProperty({
    description: 'User ID',
    example: 'clh1234567890',
  })
  id: string;

  @ApiProperty({
    description: 'Username',
    example: 'johndoe',
  })
  username: string;

  @ApiProperty({
    description: 'Avatar URL',
    example: 'https://res.cloudinary.com/...',
    nullable: true,
  })
  avatarUrl: string | null;

  @ApiProperty({
    description: 'User bio',
    example: 'Avid collector of vintage video games',
    nullable: true,
  })
  bio: string | null;

  @ApiProperty({
    description: 'User location',
    example: 'San Francisco, CA',
    nullable: true,
  })
  location: string | null;

  @ApiProperty({
    description: 'Reputation score',
    example: 4.5,
  })
  reputationScore: number;

  @ApiProperty({
    description: 'Account creation date',
    example: '2024-01-15T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Number of items posted',
    example: 12,
  })
  itemsCount: number;

  @ApiProperty({
    description: 'Number of completed trades',
    example: 8,
  })
  tradesCount: number;
}

import { ApiProperty } from '@nestjs/swagger';

export class WaitlistResponseDto {
  @ApiProperty({ example: 'cuid123' })
  id: string;

  @ApiProperty({ example: 'user@example.com' })
  email: string;

  @ApiProperty({ example: false })
  notified: boolean;

  @ApiProperty({ example: 'landing_page', nullable: true })
  source: string | null;

  @ApiProperty({ example: '2024-03-17T10:00:00Z' })
  createdAt: Date;
}

export class WaitlistStatsDto {
  @ApiProperty({ example: 150 })
  total: number;

  @ApiProperty({ example: 25 })
  notified: number;

  @ApiProperty({ example: 125 })
  pending: number;

  @ApiProperty({ example: 50 })
  last24Hours: number;

  @ApiProperty({ example: 200 })
  last7Days: number;
}

export class WaitlistEmailsDto {
  @ApiProperty({
    type: [String],
    example: ['user1@example.com', 'user2@example.com'],
  })
  emails: string[];

  @ApiProperty({ example: 150 })
  count: number;
}

import { ApiProperty } from '@nestjs/swagger';
import { DisputeReason, DisputeStatus } from '@prisma/client';

/**
 * DTO for dispute response
 */
export class DisputeResponseDto {
  @ApiProperty({
    description: 'Dispute ID',
    example: 'dispute-123',
  })
  id: string;

  @ApiProperty({
    description: 'Trade ID',
    example: 'trade-456',
  })
  tradeId: string;

  @ApiProperty({
    description: 'Reporter user ID',
    example: 'user-789',
  })
  reporterId: string;

  @ApiProperty({
    description: 'Reporter username',
    example: 'john_doe',
  })
  reporterUsername: string;

  @ApiProperty({
    description: 'Reported user ID',
    example: 'user-012',
  })
  reportedUserId: string;

  @ApiProperty({
    description: 'Reported user username',
    example: 'jane_smith',
  })
  reportedUserUsername: string;

  @ApiProperty({
    description: 'Dispute reason',
    enum: DisputeReason,
    example: DisputeReason.ITEM_NOT_AS_DESCRIBED,
  })
  reason: DisputeReason;

  @ApiProperty({
    description: 'Detailed description',
    example: 'The item was not as described in the listing.',
  })
  description: string;

  @ApiProperty({
    description: 'Dispute status',
    enum: DisputeStatus,
    example: DisputeStatus.OPEN,
  })
  status: DisputeStatus;

  @ApiProperty({
    description: 'Admin ID handling the dispute',
    example: 'admin-345',
    nullable: true,
  })
  adminId: string | null;

  @ApiProperty({
    description: 'Admin username',
    example: 'admin_user',
    nullable: true,
  })
  adminUsername: string | null;

  @ApiProperty({
    description: 'Admin notes',
    example: 'Under investigation.',
    nullable: true,
  })
  adminNotes: string | null;

  @ApiProperty({
    description: 'Resolution details',
    example: 'Trade cancelled. Refund processed.',
    nullable: true,
  })
  resolution: string | null;

  @ApiProperty({
    description: 'Resolution timestamp',
    example: '2024-11-22T15:30:00Z',
    nullable: true,
  })
  resolvedAt: Date | null;

  @ApiProperty({
    description: 'Created timestamp',
    example: '2024-11-20T10:00:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'Updated timestamp',
    example: '2024-11-22T15:30:00Z',
  })
  updatedAt: Date;
}

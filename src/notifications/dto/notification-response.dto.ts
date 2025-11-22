import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationType } from '@prisma/client';

/**
 * DTO for notification response
 */
export class NotificationResponseDto {
  @ApiProperty({
    description: 'Notification ID',
    example: 'notif-123',
  })
  id: string;

  @ApiProperty({
    description: 'Type of notification',
    enum: NotificationType,
    example: NotificationType.TRADE_PROPOSAL,
  })
  type: NotificationType;

  @ApiProperty({
    description: 'Notification title',
    example: 'New Trade Proposal',
  })
  title: string;

  @ApiProperty({
    description: 'Notification message',
    example: 'John Doe wants to trade their iPhone for your Laptop',
  })
  message: string;

  @ApiProperty({
    description: 'Whether the notification has been read',
    example: false,
  })
  isRead: boolean;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { tradeId: 'trade-123', itemId: 'item-456' },
  })
  metadata?: Record<string, any>;

  @ApiProperty({
    description: 'Notification creation timestamp',
    example: '2024-11-22T10:30:00Z',
  })
  createdAt: Date;
}

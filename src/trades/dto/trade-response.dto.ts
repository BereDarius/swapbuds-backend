import { ApiProperty } from '@nestjs/swagger';
import { TradeStatus } from '@prisma/client';

/**
 * DTO for trade response
 * Includes full trade details with item and user information
 */
export class TradeResponseDto {
  @ApiProperty({
    description: 'Trade ID',
    example: 'cm123abc456def',
  })
  id: string;

  @ApiProperty({
    description: 'Trade status',
    enum: TradeStatus,
    example: TradeStatus.PENDING,
  })
  status: TradeStatus;

  @ApiProperty({
    description: 'User who proposed the trade',
    example: {
      id: 'user123',
      username: 'johndoe',
      avatarUrl: 'https://cloudinary.com/avatar.jpg',
    },
  })
  proposer: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };

  @ApiProperty({
    description: 'User receiving the trade proposal',
    example: {
      id: 'user456',
      username: 'janedoe',
      avatarUrl: 'https://cloudinary.com/avatar2.jpg',
    },
  })
  responder: {
    id: string;
    username: string;
    avatarUrl: string | null;
  };

  @ApiProperty({
    description: 'Item being offered by proposer',
    example: {
      id: 'item123',
      title: 'Nintendo Switch Game',
      images: ['https://cloudinary.com/game.jpg'],
    },
  })
  itemOffered: {
    id: string;
    title: string;
    images: string[];
  };

  @ApiProperty({
    description: 'Item being requested by proposer',
    example: {
      id: 'item456',
      title: 'Vintage Pokemon Cards',
      images: ['https://cloudinary.com/cards.jpg'],
    },
  })
  itemRequested: {
    id: string;
    title: string;
    images: string[];
  };

  @ApiProperty({
    description: 'Optional message from proposer',
    example: 'Would love to trade!',
    required: false,
  })
  message: string | null;

  @ApiProperty({
    description: 'When the trade was created',
    example: '2024-11-22T10:30:00Z',
  })
  createdAt: Date;

  @ApiProperty({
    description: 'When the trade was last updated',
    example: '2024-11-22T10:30:00Z',
  })
  updatedAt: Date;

  @ApiProperty({
    description: 'When the trade was completed (if applicable)',
    example: '2024-11-23T15:45:00Z',
    required: false,
  })
  completedAt: Date | null;
}

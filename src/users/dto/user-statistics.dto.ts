import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for user trade statistics
 */
export class UserStatisticsDto {
  @ApiProperty({
    description: 'Total number of trades initiated by the user',
    example: 25,
  })
  totalTradesInitiated: number;

  @ApiProperty({
    description: 'Total number of trades received by the user',
    example: 30,
  })
  totalTradesReceived: number;

  @ApiProperty({
    description: 'Total number of completed trades',
    example: 15,
  })
  totalCompletedTrades: number;

  @ApiProperty({
    description: 'Total number of accepted trades',
    example: 20,
  })
  totalAcceptedTrades: number;

  @ApiProperty({
    description: 'Total number of rejected trades',
    example: 10,
  })
  totalRejectedTrades: number;

  @ApiProperty({
    description: 'Total number of cancelled trades',
    example: 3,
  })
  totalCancelledTrades: number;

  @ApiProperty({
    description: 'Total number of expired trades',
    example: 7,
  })
  totalExpiredTrades: number;

  @ApiProperty({
    description:
      'Trade success rate as a percentage (completed / (initiated + received))',
    example: 27.27,
  })
  successRate: number;

  @ApiProperty({
    description: 'Average response time in hours for received trades',
    example: 18.5,
    nullable: true,
  })
  averageResponseTime: number | null;

  @ApiProperty({
    description: 'Total number of counter-offers made by the user',
    example: 5,
  })
  totalCounterOffers: number;

  @ApiProperty({
    description: 'Number of currently pending trades as proposer',
    example: 3,
  })
  pendingAsProposer: number;

  @ApiProperty({
    description: 'Number of currently pending trades as responder',
    example: 2,
  })
  pendingAsResponder: number;
}

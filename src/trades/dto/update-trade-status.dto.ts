import { ApiProperty } from '@nestjs/swagger';
import { TradeStatus } from '@prisma/client';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * DTO for updating trade status
 * Used when accepting, rejecting, or cancelling a trade
 */
export class UpdateTradeStatusDto {
  @ApiProperty({
    description: 'New trade status',
    enum: [
      TradeStatus.ACCEPTED,
      TradeStatus.REJECTED,
      TradeStatus.CANCELLED,
      TradeStatus.COMPLETED,
    ],
    example: TradeStatus.ACCEPTED,
  })
  @IsEnum(TradeStatus)
  @IsNotEmpty()
  status: TradeStatus;
}

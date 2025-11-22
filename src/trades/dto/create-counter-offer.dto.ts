import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * DTO for creating a counter-offer
 */
export class CreateCounterOfferDto {
  @ApiProperty({
    description: 'Alternative item ID being offered',
    example: 'clh1234567890',
  })
  @IsString()
  @IsNotEmpty()
  alternativeItemId: string;

  @ApiProperty({
    description: 'Optional message explaining the counter-offer',
    example: "How about this item instead? It's in better condition.",
    maxLength: 500,
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}

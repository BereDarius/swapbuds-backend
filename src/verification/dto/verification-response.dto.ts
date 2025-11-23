import { ApiProperty } from '@nestjs/swagger';
import { DocumentType, VerificationStatus } from '@prisma/client';

/**
 * Response DTO for verification
 */
export class VerificationResponseDto {
  @ApiProperty({ example: 'cm123abc456def' })
  id: string;

  @ApiProperty({ example: 'user-123' })
  userId: string;

  @ApiProperty({
    enum: VerificationStatus,
    example: VerificationStatus.PENDING,
  })
  status: VerificationStatus;

  @ApiProperty({ enum: DocumentType, example: DocumentType.ID_CARD })
  documentType: DocumentType;

  @ApiProperty({ example: '2024-01-15T10:00:00Z' })
  submittedAt: Date;

  @ApiProperty({
    example: '2024-01-16T14:30:00Z',
    required: false,
    nullable: true,
  })
  reviewedAt?: Date | null;

  @ApiProperty({ example: null, required: false, nullable: true })
  rejectionReason?: string | null;

  @ApiProperty({ example: true, required: false, nullable: true })
  isOver18?: boolean | null;
}

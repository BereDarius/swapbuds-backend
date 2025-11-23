import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsString } from 'class-validator';

/**
 * DTO for submitting ID verification request
 */
export class SubmitVerificationDto {
  @ApiProperty({
    description: 'Type of ID document being submitted',
    enum: DocumentType,
    example: DocumentType.ID_CARD,
  })
  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  @ApiProperty({
    description: 'URL of the uploaded ID document (from Cloudinary)',
    example: 'https://res.cloudinary.com/.../id-document.jpg',
  })
  @IsString()
  @IsNotEmpty()
  documentUrl: string;
}

/**
 * DTO for admin to review verification
 */
export class ReviewVerificationDto {
  @ApiPropertyOptional({
    description: 'Date of birth extracted from the ID document',
    example: '1995-05-15',
  })
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if rejecting)',
    example: 'Document is blurry and unreadable',
  })
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({
    description: 'Internal notes for reviewers',
    example: 'Document appears to be altered',
  })
  @IsString()
  notes?: string;
}

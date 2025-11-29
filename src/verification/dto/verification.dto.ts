import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

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
    description: 'URL of the front of the ID document (from Cloudinary)',
    example: 'https://res.cloudinary.com/.../id-document-front.jpg',
  })
  @IsString()
  @IsNotEmpty()
  documentUrlFront: string;

  @ApiProperty({
    description:
      'URL of the back of the ID document (optional, from Cloudinary)',
    example: 'https://res.cloudinary.com/.../id-document-back.jpg',
    required: false,
  })
  @IsString()
  documentUrlBack?: string;

  @ApiProperty({
    description: 'URL of live selfie photo for identity verification',
    example: 'https://res.cloudinary.com/.../selfie.jpg',
  })
  @IsString()
  @IsNotEmpty()
  selfieUrl: string;
}

/**
 * DTO for admin to review verification
 */
export class ReviewVerificationDto {
  @ApiPropertyOptional({
    description: 'Date of birth extracted from the ID document',
    example: '1995-05-15',
  })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({
    description: 'Reason for rejection (required if rejecting)',
    example: 'Document is blurry and unreadable',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({
    description: 'Internal notes for reviewers',
    example: 'Document appears to be altered',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}

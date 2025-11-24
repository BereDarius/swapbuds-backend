import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalDocumentType } from '@prisma/client';
import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class AcceptLegalDocumentDto {
  @ApiProperty({
    description: 'Type of legal document being accepted',
    enum: LegalDocumentType,
    example: LegalDocumentType.TERMS_OF_SERVICE,
  })
  @IsEnum(LegalDocumentType)
  @IsNotEmpty()
  documentType: LegalDocumentType;

  @ApiProperty({
    description: 'Version of the document being accepted',
    example: '1.0.0',
  })
  @IsString()
  @IsNotEmpty()
  documentVersion: string;

  @ApiPropertyOptional({
    description: 'Additional metadata about the acceptance',
    example: { source: 'registration', page: '/register' },
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

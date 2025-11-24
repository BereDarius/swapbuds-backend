import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LegalDocumentType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateLegalDocumentDto {
  @ApiProperty({
    description: 'Type of legal document',
    enum: LegalDocumentType,
    example: LegalDocumentType.TERMS_OF_SERVICE,
  })
  @IsEnum(LegalDocumentType)
  @IsNotEmpty()
  type: LegalDocumentType;

  @ApiProperty({
    description: 'Version number (e.g., "1.0.0", "2.1.0")',
    example: '1.0.0',
  })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({
    description: 'Document content in English (Markdown or HTML)',
    example: '# Terms of Service\n\nWelcome to SwapBuds...',
  })
  @IsString()
  @IsNotEmpty()
  contentEn: string;

  @ApiProperty({
    description: 'Document content in Romanian (Markdown or HTML)',
    example: '# Termeni și Condiții\n\nBine ați venit la SwapBuds...',
  })
  @IsString()
  @IsNotEmpty()
  contentRo: string;

  @ApiProperty({
    description: 'Document title',
    example: 'Terms of Service',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'Brief summary of changes in this version',
    example: 'Updated section 5.2 to clarify age requirements',
  })
  @IsString()
  @IsOptional()
  summary?: string;

  @ApiProperty({
    description: 'When this version becomes effective',
    example: '2025-12-01T00:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  effectiveAt: Date;

  @ApiPropertyOptional({
    description: 'Whether this version is active',
    example: true,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

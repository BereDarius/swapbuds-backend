import { AdminRoles } from '@/admin-auth/decorators/admin-roles.decorator';
import { AdminJwtAuthGuard } from '@/admin-auth/guards/admin-jwt-auth.guard';
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminRole, LegalDocumentType } from '@prisma/client';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AcceptLegalDocumentDto,
  CookieConsentDto,
  CreateLegalDocumentDto,
} from './dto';
import { LegalService } from './legal.service';

@ApiTags('Legal')
@Controller('legal')
export class LegalController {
  constructor(private readonly legalService: LegalService) {}

  /**
   * Get active version of a legal document (public access)
   */
  @Get('documents/:type')
  @ApiOperation({
    summary: 'Get active version of legal document',
    description:
      'Publicly accessible endpoint to get TOS, Privacy Policy, etc.',
  })
  @ApiParam({
    name: 'type',
    enum: LegalDocumentType,
    description: 'Type of legal document',
  })
  @ApiQuery({
    name: 'lang',
    enum: ['en', 'ro'],
    required: false,
    description: 'Language (default: en)',
  })
  @ApiResponse({ status: 200, description: 'Legal document returned' })
  @ApiResponse({ status: 404, description: 'Document not found' })
  async getActiveLegalDocument(
    @Param('type') type: LegalDocumentType,
    @Query('lang') lang: 'en' | 'ro' = 'en',
  ) {
    return this.legalService.getActiveLegalDocument(type, lang);
  }

  /**
   * Get specific version of a legal document (public access)
   */
  @Get('documents/:type/version/:version')
  @ApiOperation({
    summary: 'Get specific version of legal document',
    description: 'Get a historical version of a legal document',
  })
  @ApiParam({
    name: 'type',
    enum: LegalDocumentType,
    description: 'Type of legal document',
  })
  @ApiParam({
    name: 'version',
    description: 'Document version (e.g., "1.0.0")',
  })
  @ApiQuery({
    name: 'lang',
    enum: ['en', 'ro'],
    required: false,
    description: 'Language (default: en)',
  })
  @ApiResponse({ status: 200, description: 'Legal document returned' })
  @ApiResponse({ status: 404, description: 'Document version not found' })
  async getLegalDocumentByVersion(
    @Param('type') type: LegalDocumentType,
    @Param('version') version: string,
    @Query('lang') lang: 'en' | 'ro' = 'en',
  ) {
    return this.legalService.getLegalDocumentByVersion(type, version, lang);
  }

  /**
   * List all versions of a document type (public access)
   */
  @Get('documents/:type/versions')
  @ApiOperation({
    summary: 'List all versions of a legal document',
    description: 'Get metadata for all versions of a document type',
  })
  @ApiParam({
    name: 'type',
    enum: LegalDocumentType,
    description: 'Type of legal document',
  })
  @ApiResponse({ status: 200, description: 'List of document versions' })
  async listLegalDocuments(@Param('type') type: LegalDocumentType) {
    return this.legalService.listLegalDocuments(type);
  }

  /**
   * Create a new legal document version (admin only)
   */
  @Post('documents')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new legal document version',
    description: 'Admin only: Create a new version of a legal document',
  })
  @ApiResponse({ status: 201, description: 'Document created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  @ApiResponse({ status: 409, description: 'Version already exists' })
  async createLegalDocument(
    @Body(ValidationPipe) createDto: CreateLegalDocumentDto,
  ) {
    return this.legalService.createLegalDocument(createDto);
  }

  /**
   * Set a document version as active (admin only)
   */
  @Put('documents/:type/version/:version/activate')
  @UseGuards(AdminJwtAuthGuard)
  @AdminRoles(AdminRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Set document version as active',
    description: 'Admin only: Activate a specific document version',
  })
  @ApiParam({
    name: 'type',
    enum: LegalDocumentType,
    description: 'Type of legal document',
  })
  @ApiParam({
    name: 'version',
    description: 'Document version to activate',
  })
  @ApiResponse({ status: 200, description: 'Version activated successfully' })
  @ApiResponse({ status: 404, description: 'Document version not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - admin only' })
  async setActiveVersion(
    @Param('type') type: LegalDocumentType,
    @Param('version') version: string,
  ) {
    return this.legalService.setActiveVersion(type, version);
  }

  /**
   * Accept a legal document (authenticated users)
   */
  @Post('accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Accept a legal document',
    description: 'Record user acceptance of TOS, Privacy Policy, etc.',
  })
  @ApiResponse({ status: 201, description: 'Acceptance recorded' })
  @ApiResponse({ status: 400, description: 'Invalid document version' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async acceptLegalDocument(
    @Body(ValidationPipe) acceptDto: AcceptLegalDocumentDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const userId = req.user.id;
    const ipAddress = req.ip;
    const userAgent = req.headers['user-agent'];

    return this.legalService.acceptLegalDocument(
      userId,
      acceptDto,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Get user's consent history
   */
  @Get('consents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get user consent history',
    description:
      'Get all legal document acceptances for the authenticated user',
  })
  @ApiQuery({
    name: 'type',
    enum: LegalDocumentType,
    required: false,
    description: 'Filter by document type',
  })
  @ApiResponse({ status: 200, description: 'Consent history returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getUserConsents(
    @Req() req: Request & { user: { id: string } },
    @Query('type') type?: LegalDocumentType,
  ) {
    const userId = req.user.id;
    return this.legalService.getUserConsents(userId, type);
  }

  /**
   * Check if user needs to accept updated documents
   */
  @Get('acceptance-required')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Check if legal acceptance required',
    description: 'Check if user needs to accept updated TOS or Privacy Policy',
  })
  @ApiResponse({ status: 200, description: 'Acceptance status returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async checkAcceptanceRequired(
    @Req() req: Request & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.legalService.checkLegalAcceptanceRequired(userId);
  }

  /**
   * Update cookie consent
   */
  @Post('cookie-consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update cookie consent',
    description: 'Update user cookie consent preferences',
  })
  @ApiResponse({ status: 200, description: 'Cookie consent updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateCookieConsent(
    @Body(ValidationPipe) consentDto: CookieConsentDto,
    @Req() req: Request & { user: { id: string } },
  ) {
    const userId = req.user.id;
    return this.legalService.updateCookieConsent(userId, consentDto);
  }

  /**
   * Get cookie consent
   */
  @Get('cookie-consent')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get cookie consent',
    description: 'Get user cookie consent preferences',
  })
  @ApiResponse({ status: 200, description: 'Cookie consent returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCookieConsent(@Req() req: Request & { user: { id: string } }) {
    const userId = req.user.id;
    return this.legalService.getCookieConsent(userId);
  }
}

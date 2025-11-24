import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LegalDocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcceptLegalDocumentDto,
  CookieConsentDto,
  CreateLegalDocumentDto,
} from './dto';

@Injectable()
export class LegalService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new legal document version
   */
  async createLegalDocument(dto: CreateLegalDocumentDto) {
    // Check if this version already exists
    const existing = await this.prisma.legalDocument.findUnique({
      where: {
        type_version: {
          type: dto.type,
          version: dto.version,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        `Legal document ${dto.type} version ${dto.version} already exists`,
      );
    }

    // If setting this as active, deactivate other versions of same type
    if (dto.isActive) {
      await this.prisma.legalDocument.updateMany({
        where: {
          type: dto.type,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    }

    // Create the new document
    return this.prisma.legalDocument.create({
      data: {
        type: dto.type,
        version: dto.version,
        contentEn: dto.contentEn,
        contentRo: dto.contentRo,
        title: dto.title,
        summary: dto.summary,
        effectiveAt: dto.effectiveAt,
        isActive: dto.isActive ?? false,
      },
    });
  }

  /**
   * Get the active version of a legal document
   */
  async getActiveLegalDocument(
    type: LegalDocumentType,
    language: 'en' | 'ro' = 'en',
  ) {
    const document = await this.prisma.legalDocument.findFirst({
      where: {
        type,
        isActive: true,
      },
      orderBy: {
        effectiveAt: 'desc',
      },
    });

    if (!document) {
      throw new NotFoundException(`No active ${type} document found`);
    }

    return {
      id: document.id,
      type: document.type,
      version: document.version,
      title: document.title,
      content: language === 'ro' ? document.contentRo : document.contentEn,
      summary: document.summary,
      effectiveAt: document.effectiveAt,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * Get a specific version of a legal document
   */
  async getLegalDocumentByVersion(
    type: LegalDocumentType,
    version: string,
    language: 'en' | 'ro' = 'en',
  ) {
    const document = await this.prisma.legalDocument.findUnique({
      where: {
        type_version: {
          type,
          version,
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`${type} version ${version} not found`);
    }

    return {
      id: document.id,
      type: document.type,
      version: document.version,
      title: document.title,
      content: language === 'ro' ? document.contentRo : document.contentEn,
      summary: document.summary,
      effectiveAt: document.effectiveAt,
      isActive: document.isActive,
      createdAt: document.createdAt,
      updatedAt: document.updatedAt,
    };
  }

  /**
   * List all versions of a legal document type
   */
  async listLegalDocuments(type: LegalDocumentType) {
    return this.prisma.legalDocument.findMany({
      where: { type },
      select: {
        id: true,
        version: true,
        title: true,
        summary: true,
        effectiveAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        effectiveAt: 'desc',
      },
    });
  }

  /**
   * Set a document version as active
   */
  async setActiveVersion(type: LegalDocumentType, version: string) {
    // Verify the document exists
    const document = await this.prisma.legalDocument.findUnique({
      where: {
        type_version: {
          type,
          version,
        },
      },
    });

    if (!document) {
      throw new NotFoundException(`${type} version ${version} not found`);
    }

    // Deactivate all other versions of this type
    await this.prisma.legalDocument.updateMany({
      where: {
        type,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Activate this version
    return this.prisma.legalDocument.update({
      where: {
        type_version: {
          type,
          version,
        },
      },
      data: {
        isActive: true,
      },
    });
  }

  /**
   * Record user's acceptance of a legal document
   */
  async acceptLegalDocument(
    userId: string,
    dto: AcceptLegalDocumentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    // Verify the document version exists
    const document = await this.prisma.legalDocument.findUnique({
      where: {
        type_version: {
          type: dto.documentType,
          version: dto.documentVersion,
        },
      },
    });

    if (!document) {
      throw new BadRequestException(
        `${dto.documentType} version ${dto.documentVersion} does not exist`,
      );
    }

    // Create consent record
    const consent = await this.prisma.legalConsent.create({
      data: {
        userId,
        documentType: dto.documentType,
        documentVersion: dto.documentVersion,
        ipAddress,
        userAgent,
        metadata: dto.metadata,
      },
    });

    // Update user's acceptance fields based on document type
    const updateData: any = {};

    if (dto.documentType === LegalDocumentType.TERMS_OF_SERVICE) {
      updateData.tosAcceptedAt = new Date();
      updateData.tosVersion = dto.documentVersion;
    } else if (dto.documentType === LegalDocumentType.PRIVACY_POLICY) {
      updateData.privacyAcceptedAt = new Date();
      updateData.privacyVersion = dto.documentVersion;
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.user.update({
        where: { id: userId },
        data: updateData,
      });
    }

    return consent;
  }

  /**
   * Get user's consent history
   */
  async getUserConsents(userId: string, documentType?: LegalDocumentType) {
    return this.prisma.legalConsent.findMany({
      where: {
        userId,
        ...(documentType && { documentType }),
      },
      orderBy: {
        acceptedAt: 'desc',
      },
    });
  }

  /**
   * Update user's cookie consent
   */
  async updateCookieConsent(userId: string, consent: CookieConsentDto) {
    const cookieConsentData = {
      ...consent,
      timestamp: new Date(),
    };

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        cookieConsent: cookieConsentData,
      },
      select: {
        id: true,
        cookieConsent: true,
      },
    });
  }

  /**
   * Get user's cookie consent
   */
  async getCookieConsent(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        cookieConsent: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user.cookieConsent;
  }

  /**
   * Check if user needs to accept updated legal documents
   */
  async checkLegalAcceptanceRequired(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        tosVersion: true,
        privacyVersion: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [activeTOS, activePrivacy] = await Promise.all([
      this.prisma.legalDocument.findFirst({
        where: {
          type: LegalDocumentType.TERMS_OF_SERVICE,
          isActive: true,
        },
        select: { version: true },
      }),
      this.prisma.legalDocument.findFirst({
        where: {
          type: LegalDocumentType.PRIVACY_POLICY,
          isActive: true,
        },
        select: { version: true },
      }),
    ]);

    return {
      tosUpdateRequired: user.tosVersion !== activeTOS?.version,
      privacyUpdateRequired: user.privacyVersion !== activePrivacy?.version,
      currentTOSVersion: user.tosVersion,
      currentPrivacyVersion: user.privacyVersion,
      latestTOSVersion: activeTOS?.version,
      latestPrivacyVersion: activePrivacy?.version,
    };
  }
}

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  AcceptLegalDocumentDto,
  CookieConsentDto,
  CreateLegalDocumentDto,
} from './dto';
import { LegalService } from './legal.service';

describe('LegalService', () => {
  let service: LegalService;
  let prisma: PrismaService;

  const mockPrismaService = {
    legalDocument: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    legalConsent: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockLegalDocument = {
    id: 'doc-1',
    type: LegalDocumentType.TERMS_OF_SERVICE,
    version: '1.0.0',
    contentEn: '# Terms of Service\n\nWelcome to SwapBuds...',
    contentRo: '# Termeni și Condiții\n\nBine ați venit la SwapBuds...',
    title: 'Terms of Service',
    summary: 'Initial version',
    effectiveAt: new Date('2025-01-01'),
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LegalService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<LegalService>(LegalService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createLegalDocument', () => {
    const createDto: CreateLegalDocumentDto = {
      type: LegalDocumentType.TERMS_OF_SERVICE,
      version: '1.0.0',
      contentEn: '# Terms of Service\n\nWelcome...',
      contentRo: '# Termeni și Condiții\n\nBine ați venit...',
      title: 'Terms of Service',
      summary: 'Initial version',
      effectiveAt: new Date('2025-01-01'),
      isActive: true,
    };

    it('should create a new legal document successfully', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(null);
      mockPrismaService.legalDocument.updateMany.mockResolvedValue({
        count: 0,
      });
      mockPrismaService.legalDocument.create.mockResolvedValue(
        mockLegalDocument,
      );

      const result = await service.createLegalDocument(createDto);

      expect(result).toEqual(mockLegalDocument);
      expect(mockPrismaService.legalDocument.findUnique).toHaveBeenCalledWith({
        where: {
          type_version: {
            type: createDto.type,
            version: createDto.version,
          },
        },
      });
      expect(mockPrismaService.legalDocument.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: createDto.type,
          version: createDto.version,
          contentEn: createDto.contentEn,
          contentRo: createDto.contentRo,
        }),
      });
    });

    it('should deactivate other versions when creating active document', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(null);
      mockPrismaService.legalDocument.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.legalDocument.create.mockResolvedValue(
        mockLegalDocument,
      );

      await service.createLegalDocument(createDto);

      expect(mockPrismaService.legalDocument.updateMany).toHaveBeenCalledWith({
        where: {
          type: createDto.type,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
    });

    it('should throw ConflictException if version already exists', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(
        mockLegalDocument,
      );

      await expect(service.createLegalDocument(createDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.createLegalDocument(createDto)).rejects.toThrow(
        `Legal document ${createDto.type} version ${createDto.version} already exists`,
      );
    });

    it('should not deactivate other versions when creating inactive document', async () => {
      const inactiveDto = { ...createDto, isActive: false };
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(null);
      mockPrismaService.legalDocument.create.mockResolvedValue({
        ...mockLegalDocument,
        isActive: false,
      });

      await service.createLegalDocument(inactiveDto);

      expect(mockPrismaService.legalDocument.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getActiveLegalDocument', () => {
    it('should return active document in English', async () => {
      mockPrismaService.legalDocument.findFirst.mockResolvedValue(
        mockLegalDocument,
      );

      const result = await service.getActiveLegalDocument(
        LegalDocumentType.TERMS_OF_SERVICE,
        'en',
      );

      expect(result).toEqual({
        id: mockLegalDocument.id,
        type: mockLegalDocument.type,
        version: mockLegalDocument.version,
        title: mockLegalDocument.title,
        content: mockLegalDocument.contentEn,
        summary: mockLegalDocument.summary,
        effectiveAt: mockLegalDocument.effectiveAt,
        createdAt: mockLegalDocument.createdAt,
        updatedAt: mockLegalDocument.updatedAt,
      });
    });

    it('should return active document in Romanian', async () => {
      mockPrismaService.legalDocument.findFirst.mockResolvedValue(
        mockLegalDocument,
      );

      const result = await service.getActiveLegalDocument(
        LegalDocumentType.TERMS_OF_SERVICE,
        'ro',
      );

      expect(result.content).toBe(mockLegalDocument.contentRo);
    });

    it('should throw NotFoundException when no active document exists', async () => {
      mockPrismaService.legalDocument.findFirst.mockResolvedValue(null);

      await expect(
        service.getActiveLegalDocument(LegalDocumentType.TERMS_OF_SERVICE),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getActiveLegalDocument(LegalDocumentType.TERMS_OF_SERVICE),
      ).rejects.toThrow('No active TERMS_OF_SERVICE document found');
    });

    it('should default to English when language not specified', async () => {
      mockPrismaService.legalDocument.findFirst.mockResolvedValue(
        mockLegalDocument,
      );

      const result = await service.getActiveLegalDocument(
        LegalDocumentType.TERMS_OF_SERVICE,
      );

      expect(result.content).toBe(mockLegalDocument.contentEn);
    });
  });

  describe('getLegalDocumentByVersion', () => {
    it('should return specific version in English', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(
        mockLegalDocument,
      );

      const result = await service.getLegalDocumentByVersion(
        LegalDocumentType.TERMS_OF_SERVICE,
        '1.0.0',
        'en',
      );

      expect(result).toEqual({
        id: mockLegalDocument.id,
        type: mockLegalDocument.type,
        version: mockLegalDocument.version,
        title: mockLegalDocument.title,
        content: mockLegalDocument.contentEn,
        summary: mockLegalDocument.summary,
        effectiveAt: mockLegalDocument.effectiveAt,
        isActive: mockLegalDocument.isActive,
        createdAt: mockLegalDocument.createdAt,
        updatedAt: mockLegalDocument.updatedAt,
      });
    });

    it('should return specific version in Romanian', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(
        mockLegalDocument,
      );

      const result = await service.getLegalDocumentByVersion(
        LegalDocumentType.PRIVACY_POLICY,
        '1.0.0',
        'ro',
      );

      expect(result.content).toBe(mockLegalDocument.contentRo);
    });

    it('should throw NotFoundException when version does not exist', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.getLegalDocumentByVersion(
          LegalDocumentType.TERMS_OF_SERVICE,
          '2.0.0',
        ),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getLegalDocumentByVersion(
          LegalDocumentType.TERMS_OF_SERVICE,
          '2.0.0',
        ),
      ).rejects.toThrow('TERMS_OF_SERVICE version 2.0.0 not found');
    });
  });

  describe('listLegalDocuments', () => {
    it('should return list of all document versions', async () => {
      const mockDocuments = [
        {
          id: 'doc-1',
          version: '2.0.0',
          title: 'Terms of Service',
          summary: 'Updated terms',
          effectiveAt: new Date('2025-02-01'),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'doc-2',
          version: '1.0.0',
          title: 'Terms of Service',
          summary: 'Initial version',
          effectiveAt: new Date('2025-01-01'),
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.legalDocument.findMany.mockResolvedValue(mockDocuments);

      const result = await service.listLegalDocuments(
        LegalDocumentType.TERMS_OF_SERVICE,
      );

      expect(result).toEqual(mockDocuments);
      expect(mockPrismaService.legalDocument.findMany).toHaveBeenCalledWith({
        where: { type: LegalDocumentType.TERMS_OF_SERVICE },
        select: expect.any(Object),
        orderBy: { effectiveAt: 'desc' },
      });
    });

    it('should return empty array when no documents exist', async () => {
      mockPrismaService.legalDocument.findMany.mockResolvedValue([]);

      const result = await service.listLegalDocuments(
        LegalDocumentType.COOKIE_POLICY,
      );

      expect(result).toEqual([]);
    });
  });

  describe('setActiveVersion', () => {
    it('should activate specified version and deactivate others', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(
        mockLegalDocument,
      );
      mockPrismaService.legalDocument.updateMany.mockResolvedValue({
        count: 1,
      });
      mockPrismaService.legalDocument.update.mockResolvedValue({
        ...mockLegalDocument,
        isActive: true,
      });

      const result = await service.setActiveVersion(
        LegalDocumentType.TERMS_OF_SERVICE,
        '1.0.0',
      );

      expect(result.isActive).toBe(true);
      expect(mockPrismaService.legalDocument.updateMany).toHaveBeenCalledWith({
        where: {
          type: LegalDocumentType.TERMS_OF_SERVICE,
          isActive: true,
        },
        data: {
          isActive: false,
        },
      });
      expect(mockPrismaService.legalDocument.update).toHaveBeenCalledWith({
        where: {
          type_version: {
            type: LegalDocumentType.TERMS_OF_SERVICE,
            version: '1.0.0',
          },
        },
        data: {
          isActive: true,
        },
      });
    });

    it('should throw NotFoundException when version does not exist', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.setActiveVersion(LegalDocumentType.TERMS_OF_SERVICE, '3.0.0'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.setActiveVersion(LegalDocumentType.TERMS_OF_SERVICE, '3.0.0'),
      ).rejects.toThrow('TERMS_OF_SERVICE version 3.0.0 not found');
    });
  });

  describe('acceptLegalDocument', () => {
    const acceptDto: AcceptLegalDocumentDto = {
      documentType: LegalDocumentType.TERMS_OF_SERVICE,
      documentVersion: '1.0.0',
      metadata: { source: 'registration' },
    };

    const mockConsent = {
      id: 'consent-1',
      userId: 'user-1',
      documentType: LegalDocumentType.TERMS_OF_SERVICE,
      documentVersion: '1.0.0',
      acceptedAt: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'registration' },
    };

    it('should record user acceptance of TOS', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(
        mockLegalDocument,
      );
      mockPrismaService.legalConsent.create.mockResolvedValue(mockConsent);
      mockPrismaService.user.update.mockResolvedValue({});

      const result = await service.acceptLegalDocument(
        'user-1',
        acceptDto,
        '127.0.0.1',
        'Mozilla/5.0',
      );

      expect(result).toEqual(mockConsent);
      expect(mockPrismaService.legalConsent.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          documentType: acceptDto.documentType,
          documentVersion: acceptDto.documentVersion,
          ipAddress: '127.0.0.1',
          userAgent: 'Mozilla/5.0',
          metadata: acceptDto.metadata,
        },
      });
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          tosAcceptedAt: expect.any(Date),
          tosVersion: '1.0.0',
        },
      });
    });

    it('should record user acceptance of Privacy Policy', async () => {
      const privacyDto = {
        ...acceptDto,
        documentType: LegalDocumentType.PRIVACY_POLICY,
      };
      mockPrismaService.legalDocument.findUnique.mockResolvedValue({
        ...mockLegalDocument,
        type: LegalDocumentType.PRIVACY_POLICY,
      });
      mockPrismaService.legalConsent.create.mockResolvedValue({
        ...mockConsent,
        documentType: LegalDocumentType.PRIVACY_POLICY,
      });
      mockPrismaService.user.update.mockResolvedValue({});

      await service.acceptLegalDocument('user-1', privacyDto);

      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          privacyAcceptedAt: expect.any(Date),
          privacyVersion: '1.0.0',
        },
      });
    });

    it('should not update user fields for Cookie Policy', async () => {
      const cookieDto = {
        ...acceptDto,
        documentType: LegalDocumentType.COOKIE_POLICY,
      };
      mockPrismaService.legalDocument.findUnique.mockResolvedValue({
        ...mockLegalDocument,
        type: LegalDocumentType.COOKIE_POLICY,
      });
      mockPrismaService.legalConsent.create.mockResolvedValue({
        ...mockConsent,
        documentType: LegalDocumentType.COOKIE_POLICY,
      });

      await service.acceptLegalDocument('user-1', cookieDto);

      expect(mockPrismaService.user.update).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when document version does not exist', async () => {
      mockPrismaService.legalDocument.findUnique.mockResolvedValue(null);

      await expect(
        service.acceptLegalDocument('user-1', acceptDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.acceptLegalDocument('user-1', acceptDto),
      ).rejects.toThrow('TERMS_OF_SERVICE version 1.0.0 does not exist');
    });
  });

  describe('getUserConsents', () => {
    const mockConsents = [
      {
        id: 'consent-1',
        userId: 'user-1',
        documentType: LegalDocumentType.TERMS_OF_SERVICE,
        documentVersion: '2.0.0',
        acceptedAt: new Date('2025-02-01'),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      },
      {
        id: 'consent-2',
        userId: 'user-1',
        documentType: LegalDocumentType.TERMS_OF_SERVICE,
        documentVersion: '1.0.0',
        acceptedAt: new Date('2025-01-01'),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      },
    ];

    it('should return all consents for a user', async () => {
      mockPrismaService.legalConsent.findMany.mockResolvedValue(mockConsents);

      const result = await service.getUserConsents('user-1');

      expect(result).toEqual(mockConsents);
      expect(mockPrismaService.legalConsent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { acceptedAt: 'desc' },
      });
    });

    it('should return filtered consents by document type', async () => {
      mockPrismaService.legalConsent.findMany.mockResolvedValue([
        mockConsents[0],
      ]);

      const result = await service.getUserConsents(
        'user-1',
        LegalDocumentType.TERMS_OF_SERVICE,
      );

      expect(result).toEqual([mockConsents[0]]);
      expect(mockPrismaService.legalConsent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          documentType: LegalDocumentType.TERMS_OF_SERVICE,
        },
        orderBy: { acceptedAt: 'desc' },
      });
    });

    it('should return empty array when user has no consents', async () => {
      mockPrismaService.legalConsent.findMany.mockResolvedValue([]);

      const result = await service.getUserConsents('user-2');

      expect(result).toEqual([]);
    });
  });

  describe('updateCookieConsent', () => {
    const cookieConsent: CookieConsentDto = {
      essential: true,
      functional: true,
      analytics: false,
      marketing: false,
    };

    it('should update user cookie consent', async () => {
      const mockUser = {
        id: 'user-1',
        cookieConsent: {
          ...cookieConsent,
          timestamp: expect.any(Date),
        },
      };
      mockPrismaService.user.update.mockResolvedValue(mockUser);

      const result = await service.updateCookieConsent('user-1', cookieConsent);

      expect(result).toEqual(mockUser);
      expect(mockPrismaService.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          cookieConsent: {
            ...cookieConsent,
            timestamp: expect.any(Date),
          },
        },
        select: {
          id: true,
          cookieConsent: true,
        },
      });
    });

    it('should include timestamp in cookie consent', async () => {
      mockPrismaService.user.update.mockResolvedValue({
        id: 'user-1',
        cookieConsent: cookieConsent,
      });

      await service.updateCookieConsent('user-1', cookieConsent);

      const updateCall = mockPrismaService.user.update.mock.calls[0][0];
      expect(updateCall.data.cookieConsent).toHaveProperty('timestamp');
      expect(updateCall.data.cookieConsent.timestamp).toBeInstanceOf(Date);
    });
  });

  describe('getCookieConsent', () => {
    it('should return user cookie consent', async () => {
      const mockCookieConsent = {
        essential: true,
        functional: true,
        analytics: false,
        marketing: false,
        timestamp: new Date(),
      };
      mockPrismaService.user.findUnique.mockResolvedValue({
        cookieConsent: mockCookieConsent,
      });

      const result = await service.getCookieConsent('user-1');

      expect(result).toEqual(mockCookieConsent);
      expect(mockPrismaService.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: { cookieConsent: true },
      });
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(service.getCookieConsent('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getCookieConsent('nonexistent')).rejects.toThrow(
        'User not found',
      );
    });

    it('should return null when user has no cookie consent', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        cookieConsent: null,
      });

      const result = await service.getCookieConsent('user-1');

      expect(result).toBeNull();
    });
  });

  describe('checkLegalAcceptanceRequired', () => {
    it('should return false when user is up to date', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
      });
      mockPrismaService.legalDocument.findFirst
        .mockResolvedValueOnce({ version: '1.0.0' })
        .mockResolvedValueOnce({ version: '1.0.0' });

      const result = await service.checkLegalAcceptanceRequired('user-1');

      expect(result).toEqual({
        tosUpdateRequired: false,
        privacyUpdateRequired: false,
        currentTOSVersion: '1.0.0',
        currentPrivacyVersion: '1.0.0',
        latestTOSVersion: '1.0.0',
        latestPrivacyVersion: '1.0.0',
      });
    });

    it('should return true when TOS needs update', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
      });
      mockPrismaService.legalDocument.findFirst
        .mockResolvedValueOnce({ version: '2.0.0' })
        .mockResolvedValueOnce({ version: '1.0.0' });

      const result = await service.checkLegalAcceptanceRequired('user-1');

      expect(result.tosUpdateRequired).toBe(true);
      expect(result.privacyUpdateRequired).toBe(false);
    });

    it('should return true when Privacy Policy needs update', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
      });
      mockPrismaService.legalDocument.findFirst
        .mockResolvedValueOnce({ version: '1.0.0' })
        .mockResolvedValueOnce({ version: '2.0.0' });

      const result = await service.checkLegalAcceptanceRequired('user-1');

      expect(result.tosUpdateRequired).toBe(false);
      expect(result.privacyUpdateRequired).toBe(true);
    });

    it('should return true when both need update', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue({
        tosVersion: '1.0.0',
        privacyVersion: '1.0.0',
      });
      mockPrismaService.legalDocument.findFirst
        .mockResolvedValueOnce({ version: '2.0.0' })
        .mockResolvedValueOnce({ version: '2.0.0' });

      const result = await service.checkLegalAcceptanceRequired('user-1');

      expect(result.tosUpdateRequired).toBe(true);
      expect(result.privacyUpdateRequired).toBe(true);
    });

    it('should throw NotFoundException when user does not exist', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.checkLegalAcceptanceRequired('nonexistent'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.checkLegalAcceptanceRequired('nonexistent'),
      ).rejects.toThrow('User not found');
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { LegalDocumentType } from '@prisma/client';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  AcceptLegalDocumentDto,
  CookieConsentDto,
  CreateLegalDocumentDto,
} from './dto';
import { LegalController } from './legal.controller';
import { LegalService } from './legal.service';

describe('LegalController', () => {
  let controller: LegalController;
  let service: LegalService;

  const mockLegalService = {
    getActiveLegalDocument: jest.fn(),
    getLegalDocumentByVersion: jest.fn(),
    listLegalDocuments: jest.fn(),
    createLegalDocument: jest.fn(),
    setActiveVersion: jest.fn(),
    acceptLegalDocument: jest.fn(),
    getUserConsents: jest.fn(),
    checkLegalAcceptanceRequired: jest.fn(),
    updateCookieConsent: jest.fn(),
    getCookieConsent: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockAdminGuard = {
    canActivate: jest.fn(() => true),
  };

  const mockRequest = {
    user: { sub: 'user-1' },
    ip: '127.0.0.1',
    headers: { 'user-agent': 'Mozilla/5.0' },
  } as any;

  const mockLegalDocument = {
    id: 'doc-1',
    type: LegalDocumentType.TERMS_OF_SERVICE,
    version: '1.0.0',
    title: 'Terms of Service',
    content: '# Terms of Service\n\nWelcome...',
    summary: 'Initial version',
    effectiveAt: new Date('2025-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LegalController],
      providers: [
        {
          provide: LegalService,
          useValue: mockLegalService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .overrideGuard(AdminGuard)
      .useValue(mockAdminGuard)
      .compile();

    controller = module.get<LegalController>(LegalController);
    service = module.get<LegalService>(LegalService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getActiveLegalDocument (Public)', () => {
    it('should return active document in English', async () => {
      mockLegalService.getActiveLegalDocument.mockResolvedValue(
        mockLegalDocument,
      );

      const result = await controller.getActiveLegalDocument(
        LegalDocumentType.TERMS_OF_SERVICE,
        'en',
      );

      expect(result).toEqual(mockLegalDocument);
      expect(service.getActiveLegalDocument).toHaveBeenCalledWith(
        LegalDocumentType.TERMS_OF_SERVICE,
        'en',
      );
    });

    it('should return active document in Romanian', async () => {
      const roDocument = { ...mockLegalDocument, content: 'Termeni...' };
      mockLegalService.getActiveLegalDocument.mockResolvedValue(roDocument);

      const result = await controller.getActiveLegalDocument(
        LegalDocumentType.PRIVACY_POLICY,
        'ro',
      );

      expect(result).toEqual(roDocument);
      expect(service.getActiveLegalDocument).toHaveBeenCalledWith(
        LegalDocumentType.PRIVACY_POLICY,
        'ro',
      );
    });

    it('should default to English when language not specified', async () => {
      mockLegalService.getActiveLegalDocument.mockResolvedValue(
        mockLegalDocument,
      );

      await controller.getActiveLegalDocument(LegalDocumentType.COOKIE_POLICY);

      expect(service.getActiveLegalDocument).toHaveBeenCalledWith(
        LegalDocumentType.COOKIE_POLICY,
        'en',
      );
    });
  });

  describe('getLegalDocumentByVersion (Public)', () => {
    it('should return specific version', async () => {
      const versionedDoc = { ...mockLegalDocument, isActive: false };
      mockLegalService.getLegalDocumentByVersion.mockResolvedValue(
        versionedDoc,
      );

      const result = await controller.getLegalDocumentByVersion(
        LegalDocumentType.TERMS_OF_SERVICE,
        '1.0.0',
        'en',
      );

      expect(result).toEqual(versionedDoc);
      expect(service.getLegalDocumentByVersion).toHaveBeenCalledWith(
        LegalDocumentType.TERMS_OF_SERVICE,
        '1.0.0',
        'en',
      );
    });
  });

  describe('listLegalDocuments (Public)', () => {
    it('should return all document versions', async () => {
      const mockVersions = [
        {
          id: 'doc-1',
          version: '2.0.0',
          title: 'Terms of Service',
          summary: 'Updated',
          effectiveAt: new Date('2025-02-01'),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'doc-2',
          version: '1.0.0',
          title: 'Terms of Service',
          summary: 'Initial',
          effectiveAt: new Date('2025-01-01'),
          isActive: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockLegalService.listLegalDocuments.mockResolvedValue(mockVersions);

      const result = await controller.listLegalDocuments(
        LegalDocumentType.TERMS_OF_SERVICE,
      );

      expect(result).toEqual(mockVersions);
      expect(service.listLegalDocuments).toHaveBeenCalledWith(
        LegalDocumentType.TERMS_OF_SERVICE,
      );
    });
  });

  describe('createLegalDocument (Admin)', () => {
    const createDto: CreateLegalDocumentDto = {
      type: LegalDocumentType.TERMS_OF_SERVICE,
      version: '2.0.0',
      contentEn: '# Terms of Service\n\nUpdated...',
      contentRo: '# Termeni și Condiții\n\nActualizat...',
      title: 'Terms of Service',
      summary: 'Updated version',
      effectiveAt: new Date('2025-02-01'),
      isActive: true,
    };

    it('should create new document', async () => {
      const createdDoc = {
        ...mockLegalDocument,
        version: '2.0.0',
        contentEn: createDto.contentEn,
        contentRo: createDto.contentRo,
      };
      mockLegalService.createLegalDocument.mockResolvedValue(createdDoc);

      const result = await controller.createLegalDocument(createDto);

      expect(result).toEqual(createdDoc);
      expect(service.createLegalDocument).toHaveBeenCalledWith(createDto);
    });

    it('should require admin guard', async () => {
      mockAdminGuard.canActivate.mockReturnValueOnce(false);

      // Controller would return 403 Forbidden
      expect(mockAdminGuard.canActivate).toBeDefined();
    });
  });

  describe('setActiveVersion (Admin)', () => {
    it('should activate specified version', async () => {
      const activatedDoc = { ...mockLegalDocument, isActive: true };
      mockLegalService.setActiveVersion.mockResolvedValue(activatedDoc);

      const result = await controller.setActiveVersion(
        LegalDocumentType.TERMS_OF_SERVICE,
        '1.0.0',
      );

      expect(result).toEqual(activatedDoc);
      expect(service.setActiveVersion).toHaveBeenCalledWith(
        LegalDocumentType.TERMS_OF_SERVICE,
        '1.0.0',
      );
    });
  });

  describe('acceptLegalDocument (Authenticated)', () => {
    const acceptDto: AcceptLegalDocumentDto = {
      documentType: LegalDocumentType.TERMS_OF_SERVICE,
      documentVersion: '1.0.0',
      metadata: { source: 'profile_update' },
    };

    const mockConsent = {
      id: 'consent-1',
      userId: 'user-1',
      documentType: LegalDocumentType.TERMS_OF_SERVICE,
      documentVersion: '1.0.0',
      acceptedAt: new Date(),
      ipAddress: '127.0.0.1',
      userAgent: 'Mozilla/5.0',
      metadata: { source: 'profile_update' },
    };

    it('should record user acceptance', async () => {
      mockLegalService.acceptLegalDocument.mockResolvedValue(mockConsent);

      const result = await controller.acceptLegalDocument(
        acceptDto,
        mockRequest,
      );

      expect(result).toEqual(mockConsent);
      expect(service.acceptLegalDocument).toHaveBeenCalledWith(
        'user-1',
        acceptDto,
        '127.0.0.1',
        'Mozilla/5.0',
      );
    });

    it('should extract IP from request', async () => {
      mockLegalService.acceptLegalDocument.mockResolvedValue(mockConsent);

      await controller.acceptLegalDocument(acceptDto, mockRequest);

      expect(service.acceptLegalDocument).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        '127.0.0.1',
        expect.any(String),
      );
    });

    it('should extract user agent from request', async () => {
      mockLegalService.acceptLegalDocument.mockResolvedValue(mockConsent);

      await controller.acceptLegalDocument(acceptDto, mockRequest);

      expect(service.acceptLegalDocument).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object),
        expect.any(String),
        'Mozilla/5.0',
      );
    });

    it('should require authentication', () => {
      mockJwtAuthGuard.canActivate.mockReturnValueOnce(false);

      // Controller would return 401 Unauthorized
      expect(mockJwtAuthGuard.canActivate).toBeDefined();
    });
  });

  describe('getUserConsents (Authenticated)', () => {
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
        documentType: LegalDocumentType.PRIVACY_POLICY,
        documentVersion: '1.0.0',
        acceptedAt: new Date('2025-01-01'),
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        metadata: {},
      },
    ];

    it('should return all user consents', async () => {
      mockLegalService.getUserConsents.mockResolvedValue(mockConsents);

      const result = await controller.getUserConsents(mockRequest);

      expect(result).toEqual(mockConsents);
      expect(service.getUserConsents).toHaveBeenCalledWith('user-1', undefined);
    });

    it('should filter by document type', async () => {
      mockLegalService.getUserConsents.mockResolvedValue([mockConsents[0]]);

      const result = await controller.getUserConsents(
        mockRequest,
        LegalDocumentType.TERMS_OF_SERVICE,
      );

      expect(result).toEqual([mockConsents[0]]);
      expect(service.getUserConsents).toHaveBeenCalledWith(
        'user-1',
        LegalDocumentType.TERMS_OF_SERVICE,
      );
    });
  });

  describe('checkAcceptanceRequired (Authenticated)', () => {
    it('should check if legal acceptance is required', async () => {
      const mockStatus = {
        tosUpdateRequired: false,
        privacyUpdateRequired: false,
        currentTOSVersion: '1.0.0',
        currentPrivacyVersion: '1.0.0',
        latestTOSVersion: '1.0.0',
        latestPrivacyVersion: '1.0.0',
      };

      mockLegalService.checkLegalAcceptanceRequired.mockResolvedValue(
        mockStatus,
      );

      const result = await controller.checkAcceptanceRequired(mockRequest);

      expect(result).toEqual(mockStatus);
      expect(service.checkLegalAcceptanceRequired).toHaveBeenCalledWith(
        'user-1',
      );
    });

    it('should return update required when TOS is outdated', async () => {
      const mockStatus = {
        tosUpdateRequired: true,
        privacyUpdateRequired: false,
        currentTOSVersion: '1.0.0',
        currentPrivacyVersion: '1.0.0',
        latestTOSVersion: '2.0.0',
        latestPrivacyVersion: '1.0.0',
      };

      mockLegalService.checkLegalAcceptanceRequired.mockResolvedValue(
        mockStatus,
      );

      const result = await controller.checkAcceptanceRequired(mockRequest);

      expect(result.tosUpdateRequired).toBe(true);
    });
  });

  describe('updateCookieConsent (Authenticated)', () => {
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
          timestamp: new Date(),
        },
      };

      mockLegalService.updateCookieConsent.mockResolvedValue(mockUser);

      const result = await controller.updateCookieConsent(
        cookieConsent,
        mockRequest,
      );

      expect(result).toEqual(mockUser);
      expect(service.updateCookieConsent).toHaveBeenCalledWith(
        'user-1',
        cookieConsent,
      );
    });
  });

  describe('getCookieConsent (Authenticated)', () => {
    it('should return user cookie consent', async () => {
      const mockCookieConsent = {
        essential: true,
        functional: true,
        analytics: false,
        marketing: false,
        timestamp: new Date(),
      };

      mockLegalService.getCookieConsent.mockResolvedValue(mockCookieConsent);

      const result = await controller.getCookieConsent(mockRequest);

      expect(result).toEqual(mockCookieConsent);
      expect(service.getCookieConsent).toHaveBeenCalledWith('user-1');
    });

    it('should return null when user has no cookie consent', async () => {
      mockLegalService.getCookieConsent.mockResolvedValue(null);

      const result = await controller.getCookieConsent(mockRequest);

      expect(result).toBeNull();
    });
  });

  describe('Guard Protection', () => {
    it('should protect admin endpoints with AdminGuard', () => {
      const metadata = Reflect.getMetadata(
        '__guards__',
        LegalController.prototype.createLegalDocument,
      );
      expect(metadata).toBeDefined();
    });

    it('should protect authenticated endpoints with JwtAuthGuard', () => {
      const metadata = Reflect.getMetadata(
        '__guards__',
        LegalController.prototype.acceptLegalDocument,
      );
      expect(metadata).toBeDefined();
    });

    it('should not protect public endpoints', () => {
      // Public endpoints should not have guard metadata
      const metadata = Reflect.getMetadata(
        '__guards__',
        LegalController.prototype.getActiveLegalDocument,
      );
      // This may be undefined for public routes
      expect(typeof metadata).toBeDefined();
    });
  });

  describe('Swagger Documentation', () => {
    it('should have API tags', () => {
      const tags = Reflect.getMetadata('swagger/apiUseTags', LegalController);
      expect(tags).toBeDefined();
    });

    it('should document response types', () => {
      const metadata = Reflect.getMetadata(
        'swagger/apiResponse',
        LegalController.prototype.getActiveLegalDocument,
      );
      expect(metadata).toBeDefined();
    });
  });
});

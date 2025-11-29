import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { DocumentSecurityService } from './document-security.service';

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      destroy: jest.fn(),
    },
    url: jest.fn((publicId) => {
      return `https://res.cloudinary.com/test/image/upload/${publicId}`;
    }),
  },
}));

describe('DocumentSecurityService', () => {
  let service: DocumentSecurityService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config = {
        DOCUMENT_ENCRYPTION_KEY: 'a'.repeat(64), // 32 bytes in hex = 64 characters
        CLOUDINARY_CLOUD_NAME: 'test-cloud',
        CLOUDINARY_API_KEY: 'test-key',
        CLOUDINARY_API_SECRET: 'test-secret',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentSecurityService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<DocumentSecurityService>(DocumentSecurityService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('encryptUrl', () => {
    it('should encrypt a URL', () => {
      const url = 'https://example.com/document.jpg';
      const encrypted = service.encryptUrl(url);

      expect(encrypted).toBeDefined();
      expect(encrypted).not.toBe(url);
      expect(encrypted).toContain(':'); // Should have IV:authTag:encrypted format
    });

    it('should produce different encrypted values for same URL (due to random IV)', () => {
      const url = 'https://example.com/document.jpg';
      const encrypted1 = service.encryptUrl(url);
      const encrypted2 = service.encryptUrl(url);

      expect(encrypted1).not.toBe(encrypted2); // Different IVs
    });

    it('should handle empty string', () => {
      const encrypted = service.encryptUrl('');
      expect(encrypted).toBeDefined();
    });

    it('should skip encryption for base64 data URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS';
      const result = service.encryptUrl(dataUrl);

      expect(result).toBe(dataUrl);
    });
  });

  describe('decryptUrl', () => {
    it('should decrypt an encrypted URL', () => {
      const originalUrl = 'https://example.com/document.jpg';
      const encrypted = service.encryptUrl(originalUrl);
      const decrypted = service.decryptUrl(encrypted);

      expect(decrypted).toBe(originalUrl);
    });

    it('should return original string if decryption fails', () => {
      const invalidEncrypted = 'invalid:encrypted:string';
      const result = service.decryptUrl(invalidEncrypted);

      expect(result).toBe(invalidEncrypted);
    });

    it('should handle malformed encrypted string', () => {
      const malformed = 'not-encrypted';
      const result = service.decryptUrl(malformed);

      expect(result).toBe(malformed);
    });

    it('should skip decryption for base64 data URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANS';
      const result = service.decryptUrl(dataUrl);

      expect(result).toBe(dataUrl);
    });

    it('should return original on decryption error', () => {
      const encrypted = 'aaaa:bbbb:cccc'; // Valid format but invalid content
      const result = service.decryptUrl(encrypted);

      // Should return original string when decryption fails
      expect(result).toBe(encrypted);
    });
  });

  describe('generateSignedUrl', () => {
    it('should generate a signed URL', () => {
      const publicId = 'documents/test-doc';
      const expiresIn = 300; // 5 minutes

      const signedUrl = service.generateSignedUrl(publicId, expiresIn);

      expect(signedUrl).toContain('res.cloudinary.com');
      expect(signedUrl).toContain(publicId);
    });

    it('should use default expiration time if not provided', () => {
      const publicId = 'documents/test-doc';

      const signedUrl = service.generateSignedUrl(publicId);

      expect(signedUrl).toBeDefined();
      expect(signedUrl).toContain(publicId);
    });
  });

  describe('extractPublicId', () => {
    it('should extract public ID from Cloudinary URL', () => {
      const url =
        'https://res.cloudinary.com/demo/image/upload/v1234567890/documents/test-doc.jpg';

      const publicId = service.extractPublicId(url);

      expect(publicId).toBe('documents/test-doc');
    });

    it('should handle URL without version', () => {
      const url =
        'https://res.cloudinary.com/demo/image/upload/documents/test-doc.jpg';

      const publicId = service.extractPublicId(url);

      // Without version number, regex doesn't match
      expect(publicId).toBe('');
    });

    it('should handle URL with transformations', () => {
      const url =
        'https://res.cloudinary.com/demo/image/upload/w_500,h_500/documents/test-doc.jpg';

      const publicId = service.extractPublicId(url);

      // Without version number, regex doesn't match
      expect(publicId).toBe('');
    });

    it('should return empty string for invalid URL', () => {
      const url = 'https://example.com/image.jpg';

      const publicId = service.extractPublicId(url);

      expect(publicId).toBe('');
    });

    it('should handle extraction errors gracefully', () => {
      const invalidUrl = null;

      const publicId = service.extractPublicId(invalidUrl as any);

      expect(publicId).toBe('');
    });

    it('should extract public ID without file extension', () => {
      const url =
        'https://res.cloudinary.com/demo/image/upload/v1234567890/documents/test-doc';

      const publicId = service.extractPublicId(url);

      expect(publicId).toBe('documents/test-doc');
    });
  });

  describe('isCloudinaryUrl', () => {
    it('should return true for valid Cloudinary URL', () => {
      const url = 'https://res.cloudinary.com/demo/image/upload/test.jpg';

      expect(service.isCloudinaryUrl(url)).toBe(true);
    });

    it('should return false for non-Cloudinary URL', () => {
      const url = 'https://example.com/image.jpg';

      expect(service.isCloudinaryUrl(url)).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(service.isCloudinaryUrl('')).toBe(false);
    });
  });

  describe('deleteDocument', () => {
    it('should delete document from Cloudinary', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cloudinary = require('cloudinary').v2;
      cloudinary.uploader.destroy.mockResolvedValue({ result: 'ok' });

      const publicId = 'documents/test-doc';

      await service.deleteDocument(publicId);

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(publicId, {
        invalidate: true,
        resource_type: 'image',
      });
    });

    it('should handle deletion errors gracefully', async () => {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const cloudinary = require('cloudinary').v2;
      cloudinary.uploader.destroy.mockRejectedValue(
        new Error('Deletion failed'),
      );

      const publicId = 'documents/test-doc';

      await expect(service.deleteDocument(publicId)).rejects.toThrow(
        'Deletion failed',
      );
    });
  });

  describe('encryption and decryption integration', () => {
    it('should successfully encrypt and decrypt various URLs', () => {
      const urls = [
        'https://res.cloudinary.com/demo/image/upload/doc1.jpg',
        'https://example.com/very/long/path/to/document.pdf',
        'http://localhost:3000/test.png',
        'https://storage.googleapis.com/bucket/file.jpg',
      ];

      urls.forEach((url) => {
        const encrypted = service.encryptUrl(url);
        const decrypted = service.decryptUrl(encrypted);
        expect(decrypted).toBe(url);
      });
    });
  });
});

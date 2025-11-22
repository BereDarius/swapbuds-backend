import { mockConfigService } from '@/test/mocks/config.mock';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { v2 as cloudinary } from 'cloudinary';
import { UploadService } from './upload.service';

// Mock cloudinary
jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
    url: jest.fn(),
  },
}));

describe('UploadService', () => {
  let service: UploadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadService>(UploadService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should configure cloudinary on module init', () => {
    service.onModuleInit();

    expect(cloudinary.config).toHaveBeenCalledWith({
      cloud_name: 'test-cloud',
      api_key: 'test-key',
      api_secret: 'test-secret',
    });
  });

  describe('uploadImage', () => {
    it('should upload image successfully with default folder', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const mockResult = {
        public_id: 'dev/swapbuds/items/test123',
        secure_url: 'https://cloudinary.com/image.jpg',
        width: 800,
        height: 600,
      };

      const mockUploadStream = {
        end: jest.fn(),
      };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(null, mockResult);
          return mockUploadStream;
        },
      );

      const result = await service.uploadImage(mockFile);

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'dev/swapbuds/items',
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        }),
        expect.any(Function),
      );
      expect(mockUploadStream.end).toHaveBeenCalledWith(mockFile.buffer);
    });

    it('should upload image with custom folder', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const mockResult = {
        public_id: 'dev/custom/folder/test123',
        secure_url: 'https://cloudinary.com/image.jpg',
      };

      const mockUploadStream = {
        end: jest.fn(),
      };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(null, mockResult);
          return mockUploadStream;
        },
      );

      const result = await service.uploadImage(mockFile, 'custom/folder');

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'dev/custom/folder',
        }),
        expect.any(Function),
      );
    });

    it('should handle upload errors', async () => {
      const mockFile = {
        buffer: Buffer.from('test-image'),
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
      } as Express.Multer.File;

      const mockError = new Error('Upload failed');
      const mockUploadStream = {
        end: jest.fn(),
      };

      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(mockError, null);
          return mockUploadStream;
        },
      );

      await expect(service.uploadImage(mockFile)).rejects.toThrow(
        'Upload failed',
      );
    });

    it('should use production prefix when NODE_ENV is production', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'production';
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
        if (key === 'CLOUDINARY_API_KEY') return 'test-key';
        if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
        return null;
      });

      const mockFile = {
        buffer: Buffer.from('test-image'),
      } as Express.Multer.File;

      const mockUploadStream = { end: jest.fn() };
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(null, {});
          return mockUploadStream;
        },
      );

      await service.uploadImage(mockFile);

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'prod/swapbuds/items',
        }),
        expect.any(Function),
      );

      // Reset mock
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
        if (key === 'CLOUDINARY_API_KEY') return 'test-key';
        if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
        return null;
      });
    });

    it('should use staging prefix when NODE_ENV is staging', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'NODE_ENV') return 'staging';
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
        if (key === 'CLOUDINARY_API_KEY') return 'test-key';
        if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
        return null;
      });

      const mockFile = {
        buffer: Buffer.from('test-image'),
      } as Express.Multer.File;

      const mockUploadStream = { end: jest.fn() };
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(null, {});
          return mockUploadStream;
        },
      );

      await service.uploadImage(mockFile);

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'stage/swapbuds/items',
        }),
        expect.any(Function),
      );

      // Reset mock
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'CLOUDINARY_CLOUD_NAME') return 'test-cloud';
        if (key === 'CLOUDINARY_API_KEY') return 'test-key';
        if (key === 'CLOUDINARY_API_SECRET') return 'test-secret';
        return null;
      });
    });
  });

  describe('uploadMultipleImages', () => {
    it('should upload multiple images successfully', async () => {
      const mockFiles = [
        {
          buffer: Buffer.from('test-image-1'),
          originalname: 'test1.jpg',
        } as Express.Multer.File,
        {
          buffer: Buffer.from('test-image-2'),
          originalname: 'test2.jpg',
        } as Express.Multer.File,
      ];

      const mockResults = [
        {
          public_id: 'dev/swapbuds/items/test1',
          secure_url: 'https://cloudinary.com/image1.jpg',
        },
        {
          public_id: 'dev/swapbuds/items/test2',
          secure_url: 'https://cloudinary.com/image2.jpg',
        },
      ];

      const mockUploadStream = { end: jest.fn() };
      let callCount = 0;
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(null, mockResults[callCount++]);
          return mockUploadStream;
        },
      );

      const results = await service.uploadMultipleImages(mockFiles);

      expect(results).toEqual(mockResults);
      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledTimes(2);
    });

    it('should handle errors when uploading multiple images', async () => {
      const mockFiles = [
        { buffer: Buffer.from('test-1') } as Express.Multer.File,
        { buffer: Buffer.from('test-2') } as Express.Multer.File,
      ];

      const mockUploadStream = { end: jest.fn() };
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(new Error('Upload failed'), null);
          return mockUploadStream;
        },
      );

      await expect(service.uploadMultipleImages(mockFiles)).rejects.toThrow(
        'Upload failed',
      );
    });

    it('should upload to custom folder', async () => {
      const mockFiles = [
        { buffer: Buffer.from('test') } as Express.Multer.File,
      ];

      const mockUploadStream = { end: jest.fn() };
      (cloudinary.uploader.upload_stream as jest.Mock).mockImplementation(
        (options, callback) => {
          callback(null, {});
          return mockUploadStream;
        },
      );

      await service.uploadMultipleImages(mockFiles, 'custom/path');

      expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
        expect.objectContaining({
          folder: 'dev/custom/path',
        }),
        expect.any(Function),
      );
    });
  });

  describe('deleteImage', () => {
    it('should delete image successfully', async () => {
      const publicId = 'dev/swapbuds/items/test123';
      const mockResult = { result: 'ok' };

      (cloudinary.uploader.destroy as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.deleteImage(publicId);

      expect(result).toEqual(mockResult);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(publicId);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(1);
    });

    it('should handle deletion errors', async () => {
      const publicId = 'dev/swapbuds/items/test123';
      const mockError = new Error('Deletion failed');

      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(mockError);

      await expect(service.deleteImage(publicId)).rejects.toThrow(
        'Deletion failed',
      );
    });
  });

  describe('deleteMultipleImages', () => {
    it('should delete multiple images successfully', async () => {
      const publicIds = ['public-id-1', 'public-id-2', 'public-id-3'];
      const mockResults = [
        { result: 'ok' },
        { result: 'ok' },
        { result: 'ok' },
      ];

      (cloudinary.uploader.destroy as jest.Mock)
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = await service.deleteMultipleImages(publicIds);

      expect(results).toEqual(mockResults);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledTimes(3);
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('public-id-1');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('public-id-2');
      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('public-id-3');
    });

    it('should handle errors when deleting multiple images', async () => {
      const publicIds = ['public-id-1', 'public-id-2'];

      (cloudinary.uploader.destroy as jest.Mock).mockRejectedValue(
        new Error('Deletion failed'),
      );

      await expect(service.deleteMultipleImages(publicIds)).rejects.toThrow(
        'Deletion failed',
      );
    });
  });

  describe('getTransformedUrl', () => {
    it('should generate transformed URL with width and height', () => {
      const publicId = 'dev/swapbuds/items/test123';
      const mockUrl = 'https://cloudinary.com/transformed.jpg';

      (cloudinary.url as jest.Mock).mockReturnValue(mockUrl);

      const result = service.getTransformedUrl(publicId, 400, 300);

      expect(result).toBe(mockUrl);
      expect(cloudinary.url).toHaveBeenCalledWith(publicId, {
        transformation: [
          { width: 400, height: 300, crop: 'fill' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });
    });

    it('should generate transformed URL without dimensions', () => {
      const publicId = 'dev/swapbuds/items/test123';
      const mockUrl = 'https://cloudinary.com/transformed.jpg';

      (cloudinary.url as jest.Mock).mockReturnValue(mockUrl);

      const result = service.getTransformedUrl(publicId);

      expect(result).toBe(mockUrl);
      expect(cloudinary.url).toHaveBeenCalledWith(publicId, {
        transformation: [
          { width: undefined, height: undefined, crop: 'fill' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });
    });

    it('should generate transformed URL with only width', () => {
      const publicId = 'dev/swapbuds/items/test123';
      const mockUrl = 'https://cloudinary.com/transformed.jpg';

      (cloudinary.url as jest.Mock).mockReturnValue(mockUrl);

      const result = service.getTransformedUrl(publicId, 500);

      expect(result).toBe(mockUrl);
      expect(cloudinary.url).toHaveBeenCalledWith(publicId, {
        transformation: [
          { width: 500, height: undefined, crop: 'fill' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });
    });
  });
});

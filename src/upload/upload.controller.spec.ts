import { mockUploadService } from '@/test/mocks/upload.mock';
import { UploadController } from '@/upload/upload.controller';
import { UploadService } from '@/upload/upload.service';
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

describe('UploadController', () => {
  let controller: UploadController;
  let uploadService: UploadService;

  const createMockFile = (
    mimetype: string,
    size: number,
    filename = 'test.jpg',
  ): Express.Multer.File => ({
    fieldname: 'files',
    originalname: filename,
    encoding: '7bit',
    mimetype,
    size,
    buffer: Buffer.from('fake-image-data'),
    stream: null as any,
    destination: '',
    filename: '',
    path: '',
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadController],
      providers: [
        {
          provide: UploadService,
          useValue: mockUploadService,
        },
      ],
    }).compile();

    controller = module.get<UploadController>(UploadController);
    uploadService = module.get<UploadService>(UploadService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('uploadImages', () => {
    it('should upload multiple images successfully', async () => {
      const files = [
        createMockFile('image/jpeg', 1024 * 1024, 'image1.jpg'),
        createMockFile('image/png', 2 * 1024 * 1024, 'image2.png'),
      ];

      const mockUploadResults = [
        {
          secure_url: 'https://cloudinary.com/image1.jpg',
          public_id: 'items/image1',
          width: 800,
          height: 600,
        },
        {
          secure_url: 'https://cloudinary.com/image2.png',
          public_id: 'items/image2',
          width: 1024,
          height: 768,
        },
      ];

      mockUploadService.uploadMultipleImages.mockResolvedValue(
        mockUploadResults,
      );

      const result = await controller.uploadImages(files);

      expect(result).toEqual({
        images: [
          {
            url: 'https://cloudinary.com/image1.jpg',
            publicId: 'items/image1',
            width: 800,
            height: 600,
          },
          {
            url: 'https://cloudinary.com/image2.png',
            publicId: 'items/image2',
            width: 1024,
            height: 768,
          },
        ],
      });
      expect(uploadService.uploadMultipleImages).toHaveBeenCalledWith(files);
      expect(uploadService.uploadMultipleImages).toHaveBeenCalledTimes(1);
    });

    it('should upload a single image', async () => {
      const files = [createMockFile('image/jpeg', 1024 * 1024)];

      const mockUploadResults = [
        {
          secure_url: 'https://cloudinary.com/image.jpg',
          public_id: 'items/image',
          width: 1920,
          height: 1080,
        },
      ];

      mockUploadService.uploadMultipleImages.mockResolvedValue(
        mockUploadResults,
      );

      const result = await controller.uploadImages(files);

      expect(result.images).toHaveLength(1);
      expect(result.images[0]).toEqual({
        url: 'https://cloudinary.com/image.jpg',
        publicId: 'items/image',
        width: 1920,
        height: 1080,
      });
    });

    it('should throw BadRequestException when no files provided', async () => {
      await expect(controller.uploadImages([])).rejects.toThrow(
        new BadRequestException('No files provided'),
      );

      expect(uploadService.uploadMultipleImages).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when files is undefined', async () => {
      await expect(controller.uploadImages(undefined as any)).rejects.toThrow(
        new BadRequestException('No files provided'),
      );

      expect(uploadService.uploadMultipleImages).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid file type', async () => {
      const files = [createMockFile('application/pdf', 1024 * 1024)];

      await expect(controller.uploadImages(files)).rejects.toThrow(
        new BadRequestException(
          'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed',
        ),
      );

      expect(uploadService.uploadMultipleImages).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when one file has invalid type', async () => {
      const files = [
        createMockFile('image/jpeg', 1024 * 1024),
        createMockFile('text/plain', 1024 * 1024),
      ];

      await expect(controller.uploadImages(files)).rejects.toThrow(
        new BadRequestException(
          'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed',
        ),
      );

      expect(uploadService.uploadMultipleImages).not.toHaveBeenCalled();
    });

    it('should accept PNG files', async () => {
      const files = [createMockFile('image/png', 1024 * 1024)];

      mockUploadService.uploadMultipleImages.mockResolvedValue([
        {
          secure_url: 'https://cloudinary.com/image.png',
          public_id: 'items/image',
          width: 800,
          height: 600,
        },
      ]);

      await controller.uploadImages(files);

      expect(uploadService.uploadMultipleImages).toHaveBeenCalledWith(files);
    });

    it('should accept WebP files', async () => {
      const files = [createMockFile('image/webp', 1024 * 1024)];

      mockUploadService.uploadMultipleImages.mockResolvedValue([
        {
          secure_url: 'https://cloudinary.com/image.webp',
          public_id: 'items/image',
          width: 800,
          height: 600,
        },
      ]);

      await controller.uploadImages(files);

      expect(uploadService.uploadMultipleImages).toHaveBeenCalledWith(files);
    });

    it('should accept GIF files', async () => {
      const files = [createMockFile('image/gif', 1024 * 1024)];

      mockUploadService.uploadMultipleImages.mockResolvedValue([
        {
          secure_url: 'https://cloudinary.com/image.gif',
          public_id: 'items/image',
          width: 500,
          height: 500,
        },
      ]);

      await controller.uploadImages(files);

      expect(uploadService.uploadMultipleImages).toHaveBeenCalledWith(files);
    });

    it('should throw BadRequestException for file size too large', async () => {
      const files = [createMockFile('image/jpeg', 6 * 1024 * 1024)]; // 6MB

      await expect(controller.uploadImages(files)).rejects.toThrow(
        new BadRequestException(
          'File size too large. Maximum size is 5MB per file',
        ),
      );

      expect(uploadService.uploadMultipleImages).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when one file exceeds size limit', async () => {
      const files = [
        createMockFile('image/jpeg', 1024 * 1024),
        createMockFile('image/png', 6 * 1024 * 1024), // 6MB
      ];

      await expect(controller.uploadImages(files)).rejects.toThrow(
        new BadRequestException(
          'File size too large. Maximum size is 5MB per file',
        ),
      );

      expect(uploadService.uploadMultipleImages).not.toHaveBeenCalled();
    });

    it('should accept file at maximum size limit', async () => {
      const files = [createMockFile('image/jpeg', 5 * 1024 * 1024)]; // exactly 5MB

      mockUploadService.uploadMultipleImages.mockResolvedValue([
        {
          secure_url: 'https://cloudinary.com/image.jpg',
          public_id: 'items/image',
          width: 4000,
          height: 3000,
        },
      ]);

      const result = await controller.uploadImages(files);

      expect(result.images).toHaveLength(1);
      expect(uploadService.uploadMultipleImages).toHaveBeenCalledWith(files);
    });

    it('should handle upload of maximum allowed files (10)', async () => {
      const files = Array.from({ length: 10 }, (_, i) =>
        createMockFile('image/jpeg', 1024 * 1024, `image${i}.jpg`),
      );

      const mockUploadResults = files.map((_, i) => ({
        secure_url: `https://cloudinary.com/image${i}.jpg`,
        public_id: `items/image${i}`,
        width: 800,
        height: 600,
      }));

      mockUploadService.uploadMultipleImages.mockResolvedValue(
        mockUploadResults,
      );

      const result = await controller.uploadImages(files);

      expect(result.images).toHaveLength(10);
      expect(uploadService.uploadMultipleImages).toHaveBeenCalledWith(files);
    });
  });
});

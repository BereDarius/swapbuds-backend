import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

/**
 * Service for handling file uploads to Cloudinary
 * Manages image uploads, deletions, and transformations
 */
@Injectable()
export class UploadService implements OnModuleInit {
  constructor(private configService: ConfigService) {}

  /**
   * Initialize Cloudinary configuration on module startup
   */
  onModuleInit() {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Upload a single image to Cloudinary
   * @param file - File buffer from multer
   * @param folder - Cloudinary folder path
   * @returns Upload response with URL and public ID
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string = 'swapbuds/items',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' },
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      uploadStream.end(file.buffer);
    });
  }

  /**
   * Upload multiple images to Cloudinary
   * @param files - Array of file buffers from multer
   * @param folder - Cloudinary folder path
   * @returns Array of upload responses
   */
  async uploadMultipleImages(
    files: Express.Multer.File[],
    folder: string = 'swapbuds/items',
  ): Promise<UploadApiResponse[]> {
    const uploadPromises = files.map((file) => this.uploadImage(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete an image from Cloudinary
   * @param publicId - Cloudinary public ID
   * @returns Deletion result
   */
  async deleteImage(publicId: string): Promise<any> {
    return cloudinary.uploader.destroy(publicId);
  }

  /**
   * Delete multiple images from Cloudinary
   * @param publicIds - Array of Cloudinary public IDs
   * @returns Array of deletion results
   */
  async deleteMultipleImages(publicIds: string[]): Promise<any[]> {
    const deletePromises = publicIds.map((publicId) =>
      this.deleteImage(publicId),
    );
    return Promise.all(deletePromises);
  }

  /**
   * Generate a transformed image URL
   * @param publicId - Cloudinary public ID
   * @param width - Target width
   * @param height - Target height
   * @returns Transformed image URL
   */
  getTransformedUrl(publicId: string, width?: number, height?: number): string {
    return cloudinary.url(publicId, {
      transformation: [
        { width, height, crop: 'fill' },
        { quality: 'auto' },
        { fetch_format: 'auto' },
      ],
    });
  }
}

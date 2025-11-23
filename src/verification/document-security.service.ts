import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import * as crypto from 'crypto';

/**
 * Service for handling document security
 * Manages document encryption, signed URLs, and secure access
 */
@Injectable()
export class DocumentSecurityService {
  private readonly encryptionKey: string;
  private readonly algorithm = 'aes-256-gcm';

  constructor(private configService: ConfigService) {
    // Get encryption key from environment or generate a secure one
    this.encryptionKey =
      this.configService.get<string>('DOCUMENT_ENCRYPTION_KEY') ||
      crypto.randomBytes(32).toString('hex');

    // Initialize Cloudinary
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  /**
   * Encrypt document URL for storage
   * @param url - Plain text document URL
   * @returns Encrypted URL string
   */
  encryptUrl(url: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const key = Buffer.from(this.encryptionKey, 'hex');
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      let encrypted = cipher.update(url, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      const authTag = cipher.getAuthTag();

      // Combine iv, authTag, and encrypted data
      return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
    } catch (error) {
      // If encryption fails, return original URL (fallback)
      console.error('Encryption failed:', error);
      return url;
    }
  }

  /**
   * Decrypt document URL for access
   * @param encryptedUrl - Encrypted URL string
   * @returns Decrypted URL
   */
  decryptUrl(encryptedUrl: string): string {
    try {
      const parts = encryptedUrl.split(':');
      if (parts.length !== 3) {
        // Not encrypted format, return as is
        return encryptedUrl;
      }

      const [ivHex, authTagHex, encrypted] = parts;
      const iv = Buffer.from(ivHex, 'hex');
      const authTag = Buffer.from(authTagHex, 'hex');
      const key = Buffer.from(this.encryptionKey, 'hex');

      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      // If decryption fails, return original (might be unencrypted)
      console.error('Decryption failed:', error);
      return encryptedUrl;
    }
  }

  /**
   * Generate a signed URL with expiration
   * @param publicId - Cloudinary public ID
   * @param expiresInSeconds - Expiration time in seconds (default: 5 minutes)
   * @returns Signed URL with expiration
   */
  generateSignedUrl(publicId: string, expiresInSeconds: number = 300): string {
    const timestamp = Math.floor(Date.now() / 1000) + expiresInSeconds;

    // Generate signed URL with expiration
    return cloudinary.url(publicId, {
      sign_url: true,
      secure: true,
      type: 'authenticated',
      expires_at: timestamp,
    });
  }

  /**
   * Extract public ID from Cloudinary URL
   * @param url - Cloudinary URL
   * @returns Public ID
   */
  extractPublicId(url: string): string {
    try {
      // Extract public ID from URL
      // Example: https://res.cloudinary.com/cloud/image/upload/v123/folder/file.jpg
      const match = url.match(/\/v\d+\/(.+?)(\.\w+)?$/);
      return match ? match[1] : '';
    } catch (error) {
      console.error('Failed to extract public ID:', error);
      return '';
    }
  }

  /**
   * Delete document from Cloudinary
   * @param publicId - Cloudinary public ID
   * @returns Deletion result
   */
  async deleteDocument(publicId: string): Promise<any> {
    try {
      return await cloudinary.uploader.destroy(publicId, {
        invalidate: true, // Invalidate CDN cache
        resource_type: 'image',
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
      throw error;
    }
  }

  /**
   * Validate if URL is a Cloudinary URL
   * @param url - URL to validate
   * @returns true if valid Cloudinary URL
   */
  isCloudinaryUrl(url: string): boolean {
    return url.includes('cloudinary.com') || url.includes('res.cloudinary.com');
  }
}

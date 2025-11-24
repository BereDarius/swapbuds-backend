import { MFAService } from '@/auth/mfa.service';
import { PrismaService } from '@/prisma/prisma.service';
import { mockUser } from '@/test/fixtures/user.fixture';
import { mockPrismaService } from '@/test/mocks/prisma.mock';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));
jest.mock('otplib');
jest.mock('qrcode');

describe('MFAService', () => {
  let service: MFAService;
  let prisma: typeof mockPrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MFAService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<MFAService>(MFAService);
    prisma = mockPrismaService;

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('setupMFA', () => {
    it('should setup MFA successfully', async () => {
      const password = 'password123';
      const secret = 'JBSWY3DPEHPK3PXP';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-backup-code');
      (authenticator.generateSecret as jest.Mock).mockReturnValue(secret);
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://...');
      prisma.mFASecret.upsert.mockResolvedValue({} as any);

      const QRCode = await import('qrcode');
      QRCode.toDataURL = jest
        .fn()
        .mockResolvedValue('data:image/png;base64...');

      const result = await service.setupMFA(mockUser.id, password);

      expect(result).toHaveProperty('qrCode');
      expect(result).toHaveProperty('secret');
      expect(result).toHaveProperty('backupCodes');
      expect(result.backupCodes).toHaveLength(10);
      expect(prisma.mFASecret.upsert).toHaveBeenCalled();
    });

    it('should throw UnauthorizedException for invalid password', async () => {
      const password = 'wrongpassword';

      prisma.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.setupMFA(mockUser.id, password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.setupMFA(mockUser.id, password)).rejects.toThrow(
        'Invalid password',
      );
    });

    it('should throw BadRequestException if MFA already enabled', async () => {
      const password = 'password123';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await expect(service.setupMFA(mockUser.id, password)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.setupMFA(mockUser.id, password)).rejects.toThrow(
        'MFA is already enabled for this account',
      );
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const password = 'password123';

      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.setupMFA('non-existent', password)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.setupMFA('non-existent', password)).rejects.toThrow(
        'User not found',
      );
    });
  });

  describe('verifyAndEnableMFA', () => {
    it('should verify and enable MFA successfully', async () => {
      const code = '123456';
      const secret = 'JBSWY3DPEHPK3PXP';

      prisma.mFASecret.findUnique.mockResolvedValue({
        userId: mockUser.id,
        secret: 'encrypted-secret',
        backupCodes: 'hashed1,hashed2',
      } as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      });

      // Mock decrypt method
      service['decryptSecret'] = jest.fn().mockResolvedValue(secret);

      const result = await service.verifyAndEnableMFA(mockUser.id, code);

      expect(result).toBe(true);
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { mfaEnabled: true },
      });
    });

    it('should throw BadRequestException if MFA not initiated', async () => {
      const code = '123456';

      prisma.mFASecret.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyAndEnableMFA(mockUser.id, code),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifyAndEnableMFA(mockUser.id, code),
      ).rejects.toThrow('MFA setup not initiated');
    });

    it('should throw UnauthorizedException for invalid code', async () => {
      const code = 'invalid';
      const secret = 'JBSWY3DPEHPK3PXP';

      prisma.mFASecret.findUnique.mockResolvedValue({
        userId: mockUser.id,
        secret: 'encrypted-secret',
      } as any);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      service['decryptSecret'] = jest.fn().mockResolvedValue(secret);

      await expect(
        service.verifyAndEnableMFA(mockUser.id, code),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.verifyAndEnableMFA(mockUser.id, code),
      ).rejects.toThrow('Invalid authentication code');
    });
  });

  describe('verifyMFACode', () => {
    it('should verify MFA code successfully', async () => {
      const code = '123456';
      const secret = 'JBSWY3DPEHPK3PXP';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      });
      prisma.mFASecret.findUnique.mockResolvedValue({
        userId: mockUser.id,
        secret: 'encrypted-secret',
      } as any);
      (authenticator.verify as jest.Mock).mockReturnValue(true);

      service['decryptSecret'] = jest.fn().mockResolvedValue(secret);

      const result = await service.verifyMFACode(mockUser.id, code);

      expect(result).toBe(true);
    });

    it('should throw error for invalid MFA code', async () => {
      const code = 'invalid';
      const secret = 'JBSWY3DPEHPK3PXP';

      prisma.mFASecret.findUnique.mockResolvedValue({
        userId: mockUser.id,
        secret: 'encrypted-secret',
      } as any);
      (authenticator.verify as jest.Mock).mockReturnValue(false);

      service['decryptSecret'] = jest.fn().mockResolvedValue(secret);

      await expect(service.verifyMFACode(mockUser.id, code)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.verifyMFACode(mockUser.id, code)).rejects.toThrow(
        'Invalid authentication code',
      );
    });

    it('should verify with backup code', async () => {
      const backupCode = 'backup-code-123';

      prisma.mFASecret.findUnique.mockResolvedValue({
        userId: mockUser.id,
        secret: 'encrypted-secret',
        backupCodes: 'hashed1,hashed2,hashed3',
      } as any);
      const bcryptMock = bcrypt.compare as jest.Mock;
      bcryptMock.mockClear();
      bcryptMock
        .mockResolvedValueOnce(false)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      prisma.mFASecret.update.mockResolvedValue({} as any);

      const result = await service.verifyMFACode(mockUser.id, backupCode, true);

      expect(result).toBe(true);
      expect(prisma.mFASecret.update).toHaveBeenCalled();

      // Reset bcrypt mock to default after this test
      bcryptMock.mockReset();
    });
  });

  describe('disableMFA', () => {
    it('should disable MFA successfully', async () => {
      const password = 'password123';
      const code = '123456';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        password: 'hashed-password',
      });

      // Ensure bcrypt.compare is a mock and set return value
      const bcryptCompare = bcrypt.compare as jest.Mock;
      bcryptCompare.mockClear();
      bcryptCompare.mockResolvedValue(true);

      prisma.$transaction.mockImplementation((operations: any) =>
        Promise.all(operations),
      );
      prisma.user.update.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
      });
      prisma.mFASecret.delete.mockResolvedValue({} as any);

      const verifyMFACodeSpy = jest
        .spyOn(service as any, 'verifyMFACode')
        .mockResolvedValue(true);

      await service.disableMFA(mockUser.id, password, code);

      expect(bcryptCompare).toHaveBeenCalled();
      expect(verifyMFACodeSpy).toHaveBeenCalledWith(mockUser.id, code);
      expect(prisma.$transaction).toHaveBeenCalled();

      verifyMFACodeSpy.mockRestore();
    });
    it('should throw UnauthorizedException for invalid password', async () => {
      const password = 'wrongpassword';
      const code = '123456';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.disableMFA(mockUser.id, password, code),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.disableMFA(mockUser.id, password, code),
      ).rejects.toThrow('Invalid password');
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      const password = 'password123';
      const code = '123456';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      service['verifyMFACode'] = jest
        .fn()
        .mockRejectedValue(
          new BadRequestException('MFA not configured for this user'),
        );

      await expect(
        service.disableMFA(mockUser.id, password, code),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.disableMFA(mockUser.id, password, code),
      ).rejects.toThrow('MFA not configured for this user');
    });
  });

  describe('regenerateBackupCodes', () => {
    it('should regenerate backup codes successfully', async () => {
      const password = 'password123';
      const code = '123456';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-backup-code');
      prisma.mFASecret.update.mockResolvedValue({} as any);

      service['verifyMFACode'] = jest.fn().mockResolvedValue(true);

      const result = await service.regenerateBackupCodes(
        mockUser.id,
        password,
        code,
      );

      expect(result).toHaveLength(10);
      expect(prisma.mFASecret.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException if MFA not enabled', async () => {
      const password = 'password123';
      const code = '123456';

      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
        password: 'hashed-password',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      service['verifyMFACode'] = jest
        .fn()
        .mockRejectedValue(
          new BadRequestException('MFA not configured for this user'),
        );

      await expect(
        service.regenerateBackupCodes(mockUser.id, password, code),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.regenerateBackupCodes(mockUser.id, password, code),
      ).rejects.toThrow('MFA not configured for this user');
    });
  });

  describe('isMFAEnabled', () => {
    it('should return true if MFA is enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: true,
      });

      const result = await service.isMFAEnabled(mockUser.id);

      expect(result).toBe(true);
    });

    it('should return false if MFA is not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        ...mockUser,
        mfaEnabled: false,
      });

      const result = await service.isMFAEnabled(mockUser.id);

      expect(result).toBe(false);
    });

    it('should return false if user not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      const result = await service.isMFAEnabled('non-existent');

      expect(result).toBe(false);
    });
  });
});

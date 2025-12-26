import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminRole } from '@prisma/client';
import { AdminRoleGuard } from './admin-role.guard';

describe('AdminRoleGuard', () => {
  let guard: AdminRoleGuard;
  let reflector: Reflector;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminRoleGuard,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
      ],
    }).compile();

    guard = module.get<AdminRoleGuard>(AdminRoleGuard);
    reflector = module.get<Reflector>(Reflector);
  });

  const createMockExecutionContext = (user: any = null): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
      getHandler: jest.fn(),
      getClass: jest.fn(),
    } as any;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should allow access when no roles are required', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(undefined);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when empty roles array is provided', () => {
      const context = createMockExecutionContext();
      jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when admin has ADMIN role', () => {
      const adminUser = {
        id: 'admin-1',
        email: 'admin@swapbuds.com',
        role: AdminRole.ADMIN,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.ADMIN]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when admin has MODERATOR role and MODERATOR is required', () => {
      const adminUser = {
        id: 'admin-2',
        email: 'mod@swapbuds.com',
        role: AdminRole.MODERATOR,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.MODERATOR]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when admin has SUPPORT role and SUPPORT is required', () => {
      const adminUser = {
        id: 'admin-3',
        email: 'support@swapbuds.com',
        role: AdminRole.SUPPORT,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.SUPPORT]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow access when admin role matches one of multiple required roles', () => {
      const adminUser = {
        id: 'admin-4',
        email: 'mod@swapbuds.com',
        role: AdminRole.MODERATOR,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.ADMIN, AdminRole.MODERATOR]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should allow ADMIN role when multiple roles are required including ADMIN', () => {
      const adminUser = {
        id: 'admin-5',
        email: 'admin@swapbuds.com',
        role: AdminRole.ADMIN,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([
          AdminRole.ADMIN,
          AdminRole.MODERATOR,
          AdminRole.SUPPORT,
        ]);

      const result = guard.canActivate(context);

      expect(result).toBe(true);
    });

    it('should throw ForbiddenException when admin does not have required role', () => {
      const adminUser = {
        id: 'admin-6',
        email: 'support@swapbuds.com',
        role: AdminRole.SUPPORT,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN',
      );
    });

    it('should throw ForbiddenException when SUPPORT tries to access MODERATOR route', () => {
      const adminUser = {
        id: 'admin-7',
        email: 'support@swapbuds.com',
        role: AdminRole.SUPPORT,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.MODERATOR]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: MODERATOR',
      );
    });

    it('should throw ForbiddenException when role does not match any required roles', () => {
      const adminUser = {
        id: 'admin-8',
        email: 'support@swapbuds.com',
        role: AdminRole.SUPPORT,
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.ADMIN, AdminRole.MODERATOR]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
      expect(() => guard.canActivate(context)).toThrow(
        'Access denied. Required roles: ADMIN, MODERATOR',
      );
    });

    it('should throw ForbiddenException when user is null', () => {
      const context = createMockExecutionContext(null);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user is undefined', () => {
      const context = createMockExecutionContext(undefined);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });

    it('should throw ForbiddenException when user has no role property', () => {
      const adminUser = {
        id: 'admin-9',
        email: 'test@swapbuds.com',
      };

      const context = createMockExecutionContext(adminUser);
      jest
        .spyOn(reflector, 'getAllAndOverride')
        .mockReturnValue([AdminRole.ADMIN]);

      expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
    });
  });
});

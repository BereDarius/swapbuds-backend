import { PrismaService } from '@/prisma/prisma.service';
import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminGuard } from './admin.guard';

describe('AdminGuard', () => {
  let guard: AdminGuard;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminGuard,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    guard = module.get<AdminGuard>(AdminGuard);
    prisma = module.get<PrismaService>(PrismaService);
  });

  const createMockExecutionContext = (user: any): ExecutionContext => {
    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as ExecutionContext;
  };

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('should allow access for admin user', async () => {
    const mockUser = {
      sub: 'admin-1',
      username: 'admin',
      email: 'admin@example.com',
    };

    jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValue({ isAdmin: true } as any);

    const context = createMockExecutionContext(mockUser);
    const result = await guard.canActivate(context);

    expect(result).toBe(true);
  });

  it('should deny access for non-admin user', async () => {
    const mockUser = {
      sub: 'user-1',
      username: 'user',
      email: 'user@example.com',
    };

    jest
      .spyOn(prisma.user, 'findUnique')
      .mockResolvedValue({ isAdmin: false } as any);

    const context = createMockExecutionContext(mockUser);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should deny access when user is not authenticated', async () => {
    const context = createMockExecutionContext(null);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('should deny access when user is not found', async () => {
    const mockUser = {
      sub: 'user-1',
      username: 'user',
      email: 'user@example.com',
    };

    jest.spyOn(prisma.user, 'findUnique').mockResolvedValue(null);

    const context = createMockExecutionContext(mockUser);

    await expect(guard.canActivate(context)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

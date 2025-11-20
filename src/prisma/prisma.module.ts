import { PrismaService } from '@/prisma/prisma.service';
import { Global, Module } from '@nestjs/common';

/**
 * Prisma Module
 *
 * Provides database access throughout the application.
 * Marked as @Global() so it's available in all modules without explicit imports.
 *
 * The PrismaService is exported, making it available for dependency injection
 * in any module that needs database access.
 */
@Global() // Makes this module available globally (no need to import in other modules)
@Module({
  providers: [PrismaService], // Services provided by this module
  exports: [PrismaService], // Services exported for use in other modules
})
export class PrismaModule {}

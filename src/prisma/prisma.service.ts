import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Prisma Service
 *
 * Manages the database connection and lifecycle using Prisma ORM.
 * Extends PrismaClient to provide database operations throughout the app.
 *
 * Features:
 * - Automatic connection on module initialization
 * - Automatic cleanup on module destruction
 * - Query logging in development mode
 * - Database cleaning utility for testing
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    super({
      // Configure logging based on environment
      log:
        process.env.NODE_ENV === 'development'
          ? ['query', 'info', 'warn', 'error'] // Verbose logging in development
          : ['error'], // Only errors in production
      errorFormat: 'pretty', // Human-readable error messages
    });
  }

  /**
   * Connect to database when module initializes
   * Called automatically by NestJS lifecycle
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * Disconnect from database when module is destroyed
   * Ensures graceful shutdown and no hanging connections
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Clean all data from database
   *
   * DANGER: This deletes ALL records from ALL tables!
   * Only available in non-production environments.
   * Useful for resetting test databases.
   *
   * @throws Error if called in production
   */
  async cleanDatabase() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clean database in production');
    }

    // Get all model names from Prisma Client
    const models = Reflect.ownKeys(this).filter(
      (key) => key[0] !== '_' && key !== '$connect' && key !== '$disconnect',
    );

    // Delete all records from each model
    return Promise.all(models.map((modelKey) => this[modelKey].deleteMany()));
  }
}

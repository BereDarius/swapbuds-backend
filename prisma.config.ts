// Prisma 7 configuration for migrations and generators
// See https://pris.ly/d/config-datasource

import { defineConfig } from '@prisma/config';
import { config } from 'dotenv';

// Load environment variables before Prisma config is evaluated
// This is critical for tests and CLI commands to work properly
config();

export default defineConfig({
  datasource: {
    // Migrate reads the connection string from here (not schema.prisma)
    url: process.env.DATABASE_URL ?? '',
  },
  migrations: {
    // Seed command (Prisma 7 requires this in config instead of package.json)
    seed: 'ts-node prisma/seed.ts',
  },
  // Generators are still defined in schema.prisma
});

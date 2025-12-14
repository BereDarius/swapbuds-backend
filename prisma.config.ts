// Prisma 7 configuration for migrations and generators
// See https://pris.ly/d/config-datasource

import { defineConfig } from '@prisma/config';

export default defineConfig({
  datasource: {
    // Migrate reads the connection string from here (not schema.prisma)
    url: process.env.DATABASE_URL ?? '',
  },
  // Generators are still defined in schema.prisma
});

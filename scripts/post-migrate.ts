#!/usr/bin/env npx ts-node

/**
 * Post-Migration Hook
 *
 * This script runs after `prisma migrate dev` to automatically generate
 * rollback SQL files for new migrations.
 *
 * It can be integrated into the migration workflow by:
 * 1. Running manually after migrations
 * 2. Adding as a post-script in package.json
 *
 * Usage:
 *   npx ts-node scripts/post-migrate.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

function getMigrationsWithoutRollback(): string[] {
  const dirs = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((dir) => {
      const fullPath = path.join(MIGRATIONS_DIR, dir);
      if (!fs.statSync(fullPath).isDirectory()) return false;
      if (dir.startsWith('migration_lock')) return false;

      const rollbackPath = path.join(fullPath, 'rollback.sql');
      return !fs.existsSync(rollbackPath);
    })
    .sort();

  return dirs;
}

function main(): void {
  console.log('\n🔍 Checking for migrations without rollback files...\n');

  const missingRollbacks = getMigrationsWithoutRollback();

  if (missingRollbacks.length === 0) {
    console.log('✅ All migrations have rollback files!\n');
    return;
  }

  console.log(
    `📋 Found ${missingRollbacks.length} migrations without rollback:\n`,
  );
  missingRollbacks.forEach((m) => console.log(`   - ${m}`));

  console.log('\n🔄 Generating rollback files...\n');

  try {
    execSync('npx ts-node scripts/generate-rollback.ts --missing', {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });
  } catch (error) {
    console.error('❌ Failed to generate rollback files:', error);
    process.exit(1);
  }

  console.log('\n✅ Post-migration complete!\n');
  console.log('💡 Remember to review the generated rollback.sql files');
  console.log('   Some operations may require manual adjustments.\n');
}

main();

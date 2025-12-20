#!/usr/bin/env npx ts-node

/**
 * Prisma Migration Rollback Script
 *
 * This script handles rollback of Prisma migrations by:
 * 1. Finding the rollback.sql file for the specified migration
 * 2. Executing the rollback SQL against the database
 * 3. Removing the migration record from _prisma_migrations table
 *
 * Usage:
 *   npx ts-node scripts/migrate-rollback.ts <migration_name>
 *   npx ts-node scripts/migrate-rollback.ts --last
 *   npx ts-node scripts/migrate-rollback.ts --list
 *
 * Examples:
 *   npx ts-node scripts/migrate-rollback.ts 20251130070905_add_email_verification
 *   npx ts-node scripts/migrate-rollback.ts --last
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

const MIGRATIONS_DIR = path.join(__dirname, '../prisma/migrations');

interface MigrationRecord {
  id: string;
  migration_name: string;
  finished_at: string;
}

function getMigrationDirs(): string[] {
  const dirs = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((dir) => {
      const fullPath = path.join(MIGRATIONS_DIR, dir);
      return (
        fs.statSync(fullPath).isDirectory() && dir !== 'migration_lock.toml'
      );
    })
    .sort();

  return dirs;
}

function getAppliedMigrations(): MigrationRecord[] {
  try {
    const result = execSync(
      `psql "$DATABASE_URL" -t -A -F'|' -c "SELECT id, migration_name, finished_at FROM _prisma_migrations WHERE rolled_back_at IS NULL ORDER BY finished_at DESC"`,
      { encoding: 'utf-8' },
    );

    return result
      .trim()
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => {
        const [id, migration_name, finished_at] = line.split('|');
        return { id, migration_name, finished_at };
      });
  } catch {
    console.error(
      '❌ Failed to get applied migrations. Make sure DATABASE_URL is set.',
    );
    process.exit(1);
  }
}

function listMigrations(): void {
  console.log('\n📋 Available Migrations:\n');

  const migrationDirs = getMigrationDirs();
  const appliedMigrations = getAppliedMigrations();
  const appliedNames = new Set(appliedMigrations.map((m) => m.migration_name));

  migrationDirs.forEach((dir) => {
    const hasRollback = fs.existsSync(
      path.join(MIGRATIONS_DIR, dir, 'rollback.sql'),
    );
    const isApplied = appliedNames.has(dir);
    const rollbackIndicator = hasRollback ? '✅' : '❌';
    const appliedIndicator = isApplied ? '🟢' : '⚪';

    console.log(`  ${appliedIndicator} ${rollbackIndicator} ${dir}`);
  });

  console.log('\n  Legend:');
  console.log('    🟢/⚪ = Applied/Not Applied');
  console.log('    ✅/❌ = Has Rollback/No Rollback\n');
}

function rollbackMigration(migrationName: string): void {
  console.log(`\n🔄 Rolling back migration: ${migrationName}\n`);

  const migrationDir = path.join(MIGRATIONS_DIR, migrationName);
  const rollbackFile = path.join(migrationDir, 'rollback.sql');

  // Verify migration directory exists
  if (!fs.existsSync(migrationDir)) {
    console.error(`❌ Migration directory not found: ${migrationDir}`);
    process.exit(1);
  }

  // Verify rollback file exists
  if (!fs.existsSync(rollbackFile)) {
    console.error(`❌ No rollback.sql found for migration: ${migrationName}`);
    console.log('\n💡 Create a rollback.sql file in the migration directory:');
    console.log(`   ${rollbackFile}`);
    process.exit(1);
  }

  // Verify migration is applied
  const appliedMigrations = getAppliedMigrations();
  const migration = appliedMigrations.find(
    (m) => m.migration_name === migrationName,
  );

  if (!migration) {
    console.error(
      `❌ Migration not found in applied migrations: ${migrationName}`,
    );
    console.log('\n💡 This migration may not have been applied yet.');
    process.exit(1);
  }

  // Read rollback SQL
  const rollbackSql = fs.readFileSync(rollbackFile, 'utf-8');

  console.log('📄 Rollback SQL to execute:');
  console.log('─'.repeat(60));
  console.log(rollbackSql);
  console.log('─'.repeat(60));

  // Execute rollback
  try {
    console.log('\n⏳ Executing rollback SQL...');

    // Execute the rollback SQL
    execSync(`psql "$DATABASE_URL" -c "${rollbackSql.replace(/"/g, '\\"')}"`, {
      stdio: 'inherit',
    });

    // Mark migration as rolled back in _prisma_migrations table
    console.log('\n📝 Updating migration record...');
    execSync(
      `psql "$DATABASE_URL" -c "UPDATE _prisma_migrations SET rolled_back_at = NOW() WHERE migration_name = '${migrationName}'"`,
      { stdio: 'inherit' },
    );

    console.log(`\n✅ Successfully rolled back: ${migrationName}`);
    console.log(
      '\n⚠️  Note: The migration folder is preserved. Run "prisma migrate dev" to reapply if needed.\n',
    );
  } catch (error) {
    console.error('\n❌ Rollback failed:', error);
    process.exit(1);
  }
}

function rollbackLast(): void {
  const appliedMigrations = getAppliedMigrations();

  if (appliedMigrations.length === 0) {
    console.log('\n📋 No migrations to roll back.\n');
    process.exit(0);
  }

  const lastMigration = appliedMigrations[0];
  console.log(`\n🎯 Last applied migration: ${lastMigration.migration_name}`);

  rollbackMigration(lastMigration.migration_name);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Prisma Migration Rollback Tool
==============================

Usage:
  npx ts-node scripts/migrate-rollback.ts <migration_name>  - Rollback specific migration
  npx ts-node scripts/migrate-rollback.ts --last            - Rollback last applied migration
  npx ts-node scripts/migrate-rollback.ts --list            - List all migrations

Examples:
  npx ts-node scripts/migrate-rollback.ts 20251130070905_add_email_verification
  npx ts-node scripts/migrate-rollback.ts --last
`);
    process.exit(0);
  }

  const command = args[0];

  switch (command) {
    case '--list':
    case '-l':
      listMigrations();
      break;
    case '--last':
      rollbackLast();
      break;
    default:
      rollbackMigration(command);
  }
}

// Export functions for testing
export {
  getAppliedMigrations,
  getMigrationDirs,
  listMigrations,
  rollbackLast,
  rollbackMigration,
};

// Only run if executed directly
if (require.main === module) {
  main();
}

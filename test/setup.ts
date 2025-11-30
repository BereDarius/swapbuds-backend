import { resetDatabase } from './helpers/db-reset.helper';

/**
 * Global test setup - runs once before all E2E tests
 * Resets database, runs migrations, and seeds test data
 */
export default async function globalSetup() {
  console.log('\n🔄 Resetting database for E2E tests...\n');
  await resetDatabase();
  console.log('✅ Database reset and seeded successfully!\n');
}

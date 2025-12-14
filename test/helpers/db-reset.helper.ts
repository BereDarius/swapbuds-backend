import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Reset database for E2E test isolation
 * Call this in beforeAll of each test suite to ensure clean state
 */
export async function resetDatabase() {
  try {
    await execAsync('yarn prisma migrate reset --force', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    throw error;
  }
}

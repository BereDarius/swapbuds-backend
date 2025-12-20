import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Reset database for E2E test isolation
 * Runs migrations and explicitly seeds the database
 */
export async function resetDatabase() {
  try {
    // Run migrations reset (drops schema, recreates, applies migrations)
    const { stdout, stderr } = await execAsync(
      'yarn prisma migrate reset --force',
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      },
    );

    // Log output to verify what happened
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    // Explicitly run seed to ensure data is populated
    // (Prisma 7 should auto-seed with migrate reset, but being explicit)
    const { stdout: seedOut, stderr: seedErr } = await execAsync(
      'yarn prisma db seed',
      {
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
      },
    );

    if (seedOut) console.log(seedOut);
    if (seedErr) console.error(seedErr);
  } catch (error) {
    console.error('❌ Failed to reset database:', error);
    throw error;
  }
}

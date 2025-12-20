import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { exec } from 'child_process';
import { Pool } from 'pg';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Fast database cleanup and reseed for test isolation
 * Deletes all data from tables and reseeds WITHOUT running migrations
 * Much faster than full reset - use between test suites
 */
export async function truncateAndReseed() {
  try {
    const connectionString = process.env.DATABASE_URL;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    // Delete all data using Prisma's deleteMany in reverse dependency order
    // This respects foreign key constraints
    await prisma.$transaction([
      // Delete dependent tables first
      prisma.commentVersion.deleteMany(),
      prisma.messageVersion.deleteMany(),
      prisma.commentLike.deleteMany(),
      prisma.flaggedComment.deleteMany(),
      prisma.comment.deleteMany(),
      prisma.message.deleteMany(),
      prisma.conversation.deleteMany(),
      prisma.supportMessage.deleteMany(),
      prisma.supportChat.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.dispute.deleteMany(),
      prisma.review.deleteMany(),
      prisma.counterOffer.deleteMany(),
      prisma.tradeItem.deleteMany(),
      prisma.trade.deleteMany(),
      prisma.flaggedItem.deleteMany(),
      prisma.like.deleteMany(),
      prisma.itemImage.deleteMany(),
      prisma.item.deleteMany(),
      prisma.notification.deleteMany(),
      prisma.notificationPreferences.deleteMany(),
      prisma.userVerification.deleteMany(),
      prisma.mFASecret.deleteMany(),
      prisma.oAuthAccount.deleteMany(),
      prisma.legalConsent.deleteMany(),
      prisma.userSettings.deleteMany(),
      prisma.recaptchaLog.deleteMany(),
      prisma.user.deleteMany(),
      prisma.legalDocument.deleteMany(),
      prisma.waitlist.deleteMany(),
    ]);

    await prisma.$disconnect();
    await pool.end();

    // Re-run seed only (no migrations)
    await execAsync('yarn prisma db seed', {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });
  } catch (error) {
    console.error('❌ Failed to truncate and reseed:', error);
    throw error;
  }
}

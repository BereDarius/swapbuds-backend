import { PrismaClient } from '@prisma/client';
import { seedEngagement } from './seeds/engagement.seed';
import { seedItems } from './seeds/items.seed';
import { seedLegalDocuments } from './seeds/legal.seed';
import { seedNotificationsAndSupport } from './seeds/notifications.seed';
import { seedReviews } from './seeds/reviews.seed';
import { seedUserSettings } from './seeds/settings.seed';
import { seedTrades } from './seeds/trades.seed';
import { seedUsers } from './seeds/users.seed';

const prisma = new PrismaClient();

/**
 * Main seed script for SwapBuds backend
 * Orchestrates all seed functions in the correct order
 */
async function main() {
  console.log('🌱 Starting SwapBuds database seed...\n');

  try {
    // 1. Seed legal documents first (required for user registration)
    await seedLegalDocuments(prisma);
    console.log('');

    // 2. Seed users (foundation for all other data)
    const users = await seedUsers(prisma);
    console.log('');

    // 3. Seed user settings
    await seedUserSettings(prisma, users);
    console.log('');

    // 4. Seed items (requires users)
    const items = await seedItems(prisma, users);
    console.log('');

    // 5. Seed engagement (likes & comments)
    await seedEngagement(prisma, users, items);
    console.log('');

    // 6. Seed trades (requires users and items)
    const trades = await seedTrades(prisma, users, items);
    console.log('');

    // 7. Seed reviews (requires completed trades)
    await seedReviews(prisma, users, trades);
    console.log('');

    // 8. Seed notifications and support
    await seedNotificationsAndSupport(prisma, users);
    console.log('');

    console.log('✅ All seed operations completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - ${users.length} users created`);
    console.log(`   - ${items.length} items created`);
    console.log(`   - ${trades.length} trades created`);
    console.log('\n🎉 Database is ready for testing!\n');
  } catch (error) {
    console.error('\n❌ Seed failed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error('❌ Fatal error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

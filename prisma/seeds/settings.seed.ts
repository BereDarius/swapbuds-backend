import { PrismaClient } from '@prisma/client';

/**
 * Seed user settings for all users
 */
export async function seedUserSettings(prisma: PrismaClient, users: any[]) {
  console.log('⚙️  Seeding user settings...');

  const regularUsers = users.filter((u) => u.role === 'USER');

  let settingsCreated = 0;
  for (const user of regularUsers) {
    try {
      await prisma.userSettings.create({
        data: {
          userId: user.id,
          displayEmail: false,
          displayLocation: true,
          allowMessages: true,
          profileVisibility: 'PUBLIC',
          showTradeHistory: true,
          showReviews: true,
          autoDeclineExpiredTrades: true,
          allowCounterOffers: true,
          theme: 'AUTO',
          language: 'EN',
          itemsPerPage: 12,
          defaultSortBy: 'RECENT',
          saveSearchHistory: true,
          enableRecommendations: true,
          marketingEmails: false,
          productUpdates: true,
        },
      });
      settingsCreated++;
    } catch (error) {
      // Skip if already exists
    }
  }

  console.log(`   ✅ Created ${settingsCreated} user settings`);
}

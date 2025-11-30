import { PrismaClient, User } from '@prisma/client';

/**
 * Seed disputes for trades
 */
export async function seedDisputes(
  prisma: PrismaClient,
  users: User[],
  trades: any[],
) {
  console.log('⚖️  Seeding disputes...');

  if (trades.length < 2) {
    console.log('   ⚠️  Not enough trades, skipping disputes seed');
    return [];
  }

  // Check for existing disputes
  const existingCount = await prisma.dispute.count();
  if (existingCount > 0) {
    console.log('   ⏭️  Disputes already exist, skipping...');
    return [];
  }

  // Find completed trade for dispute
  const completedTrade = trades.find((t) => t.status === 'COMPLETED');
  if (!completedTrade) {
    console.log('   ⚠️  No completed trades, skipping disputes seed');
    return [];
  }

  // NOTE: We intentionally do NOT seed disputes for the completed trade
  // to allow E2E tests to create disputes and test the full workflow.
  // In a real scenario, disputes would be created by users through the API.

  // If we wanted example disputes, we'd need a SECOND completed trade
  // to avoid conflicts with test scenarios.
  const disputesData = [];

  const createdDisputes = [];

  for (const disputeData of disputesData) {
    try {
      const dispute = await prisma.dispute.create({
        data: disputeData,
        include: {
          reporter: { select: { username: true } },
          reportedUser: { select: { username: true } },
          trade: { select: { id: true, status: true } },
        },
      });

      console.log(
        `   ✅ Created dispute: ${dispute.reporter.username} vs ${dispute.reportedUser.username} (${dispute.status})`,
      );
      createdDisputes.push(dispute);
    } catch (error) {
      console.log(`   ⚠️  Error creating dispute: ${error.message}`);
    }
  }

  console.log(`✅ Seeded ${createdDisputes.length} disputes`);
  return createdDisputes;
}

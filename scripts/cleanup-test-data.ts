import { PrismaClient } from '@prisma/client';

export async function cleanupTestData(prismaClient?: PrismaClient) {
  const prisma = prismaClient || new PrismaClient();

  console.log('🧹 Cleaning up test data...');

  // Delete test users and all related data (cascades)
  const result = await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: 'test_' } },
        { email: { contains: '@example.com' } },
        { username: { contains: 'testuser_' } },
      ],
    },
  });

  console.log(`✅ Deleted ${result.count} test users and their related data`);

  if (!prismaClient) {
    await prisma.$disconnect();
  }

  return result;
}

// Only run if executed directly
if (require.main === module) {
  cleanupTestData()
    .catch((error) => {
      console.error('❌ Error cleaning up test data:', error);
      process.exit(1);
    })
    .finally(() => {
      process.exit(0);
    });
}

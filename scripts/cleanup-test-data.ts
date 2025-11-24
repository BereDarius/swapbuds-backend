import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupTestData() {
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

  await prisma.$disconnect();
}

cleanupTestData()
  .catch((error) => {
    console.error('❌ Error cleaning up test data:', error);
    process.exit(1);
  })
  .finally(() => {
    process.exit(0);
  });

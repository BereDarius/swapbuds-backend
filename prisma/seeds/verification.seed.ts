import {
  DocumentType,
  PrismaClient,
  User,
  VerificationStatus,
} from '@prisma/client';

/**
 * Seed user verifications in various states
 */
export async function seedVerifications(prisma: PrismaClient, users: User[]) {
  console.log('🔐 Seeding user verifications...');

  // Check for existing verifications
  const existingCount = await prisma.userVerification.count();
  if (existingCount > 0) {
    console.log('   ⏭️  Verifications already exist, skipping...');
    return [];
  }

  // Get users by email for predictable seeding
  const john = users.find((u) => u.email === 'john.doe@example.com');
  const jane = users.find((u) => u.email === 'jane.smith@example.com');
  const alex = users.find((u) => u.email === 'alex.trader@example.com');
  const maria = users.find((u) => u.email === 'maria.garcia@example.com');
  const mike = users.find((u) => u.email === 'mike.collector@example.com');
  const lighthouseUser = users.find(
    (u) => u.email === 'lighthouse.user@test.com',
  );
  const admin = users.find((u) => u.role === 'ADMIN');
  const moderator = users.find((u) => u.role === 'MODERATOR');

  if (!john || !jane || !alex || !maria || !admin || !moderator) {
    console.log('   ⚠️  Required users not found, skipping verifications seed');
    return [];
  }

  const verificationsData = [
    // Lighthouse user - approved (needed for e2e performance tests)
    {
      userId: lighthouseUser!.id,
      status: VerificationStatus.APPROVED,
      documentType: DocumentType.ID_CARD,
      documentUrlFront:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/lighthouse_id_front.jpg',
      selfieUrl:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/lighthouse_selfie.jpg',
      dateOfBirth: new Date('1990-01-01'),
      isOver18: true,
      submittedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      reviewedAt: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
      reviewedBy: admin.id,
    },
    // Maria - PENDING verification (needed for verification e2e tests)
    {
      userId: maria.id,
      status: VerificationStatus.PENDING,
      documentType: DocumentType.PASSPORT,
      documentUrlFront:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/maria_passport_front.jpg',
      selfieUrl:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/maria_selfie.jpg',
      dateOfBirth: new Date('1992-11-30'),
      isOver18: true,
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    // Alex - PENDING verification (another pending for admin review tests)
    {
      userId: alex.id,
      status: VerificationStatus.PENDING,
      documentType: DocumentType.ID_CARD,
      documentUrlFront:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/alex_id_front.jpg',
      selfieUrl:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/alex_selfie.jpg',
      dateOfBirth: new Date('1995-03-10'),
      isOver18: true,
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    },
    // John - APPROVED verification
    {
      userId: john.id,
      status: VerificationStatus.APPROVED,
      documentType: DocumentType.ID_CARD,
      documentUrlFront:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/john_id_front.jpg',
      selfieUrl:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/john_selfie.jpg',
      dateOfBirth: new Date('1990-05-15'),
      isOver18: true,
      submittedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      reviewedAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000), // 9 days ago
      reviewedBy: admin.id,
    },
    // Jane - REJECTED verification (needed for rejection flow tests)
    {
      userId: jane.id,
      status: VerificationStatus.REJECTED,
      documentType: DocumentType.DRIVERS_LICENSE,
      documentUrlFront:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/jane_license_front.jpg',
      documentUrlBack:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/jane_license_back.jpg',
      selfieUrl:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/jane_selfie.jpg',
      dateOfBirth: new Date('1988-09-22'),
      isOver18: true,
      submittedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 14 days ago
      reviewedBy: moderator.id,
      rejectionReason: 'Document quality too poor to verify identity',
    },
    // Mike - APPROVED verification (needed for dispute tests with John)
    {
      userId: mike!.id,
      status: VerificationStatus.APPROVED,
      documentType: DocumentType.PASSPORT,
      documentUrlFront:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/mike_passport_front.jpg',
      selfieUrl:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/mike_selfie.jpg',
      dateOfBirth: new Date('1985-07-18'),
      isOver18: true,
      submittedAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      reviewedAt: new Date(Date.now() - 19 * 24 * 60 * 60 * 1000), // 19 days ago
      reviewedBy: admin.id,
    },
  ];

  const createdVerifications = [];

  for (const verificationData of verificationsData) {
    try {
      const verification = await prisma.userVerification.create({
        data: verificationData,
        include: {
          user: { select: { username: true } },
        },
      });

      console.log(
        `   ✅ Created verification: ${verification.user.username} (${verification.status})`,
      );
      createdVerifications.push(verification);
    } catch (error) {
      console.log(`   ⚠️  Error creating verification: ${error.message}`);
    }
  }

  console.log(`✅ Seeded ${createdVerifications.length} verifications`);
  return createdVerifications;
}

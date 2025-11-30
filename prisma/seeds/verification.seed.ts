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

  const regularUsers = users.filter((u) => u.role === 'USER');

  if (regularUsers.length < 4) {
    console.log('   ⚠️  Not enough users, skipping verifications seed');
    return [];
  }

  // Check for existing verifications
  const existingCount = await prisma.userVerification.count();
  if (existingCount > 0) {
    console.log('   ⏭️  Verifications already exist, skipping...');
    return [];
  }

  const verificationsData = [
    // User with pending verification (submitted ID card)
    {
      userId: regularUsers[0].id, // John - already verified
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
      reviewedBy: users.find((u) => u.role === 'ADMIN')?.id,
    },
    // User with approved verification (Mike - needed for completed trade)
    {
      userId: regularUsers[4].id, // Mike - already verified
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
      reviewedBy: users.find((u) => u.role === 'ADMIN')?.id,
    },
    // User with pending verification (submitted passport)
    {
      userId: regularUsers[3].id, // Maria - pending verification
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
    // User with approved verification (driver's license)
    {
      userId: regularUsers[1].id, // Jane - already verified
      status: VerificationStatus.APPROVED,
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
      reviewedBy: users.find((u) => u.role === 'MODERATOR')?.id,
    },
    // User with rejected verification (poor quality document)
    {
      userId: regularUsers[2].id, // Alex - rejected verification
      status: VerificationStatus.REJECTED,
      documentType: DocumentType.ID_CARD,
      documentUrlFront:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/alex_id_front.jpg',
      selfieUrl:
        'https://res.cloudinary.com/swapbuds/image/upload/v1234567890/verifications/alex_selfie.jpg',
      dateOfBirth: new Date('1995-03-10'),
      isOver18: true,
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      reviewedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      reviewedBy: users.find((u) => u.role === 'ADMIN')?.id,
      rejectionReason:
        'The document image is too blurry. Please submit a clear, high-quality photo of your ID.',
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

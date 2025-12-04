import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Seed users with different roles and verification states
 */
export async function seedUsers(prisma: PrismaClient) {
  console.log('👥 Seeding users...');

  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const lighthousePassword = await bcrypt.hash('LighthouseTest123!', 10);

  const users = [
    // Lighthouse test users (for CI/CD performance testing)
    {
      email: 'lighthouse.user@test.com',
      username: 'lighthouse_user',
      password: lighthousePassword,
      role: UserRole.USER,
      isVerified: true,
      emailVerified: true,
      selfDeclaredAge18: true,
      bio: 'Lighthouse test user for performance audits',
      location: 'Test City, TC',
      reputationScore: 100,
      ageVerifiedAt: new Date(),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'lighthouse.admin@test.com',
      username: 'lighthouse_admin',
      password: lighthousePassword,
      role: UserRole.ADMIN,
      isVerified: true,
      emailVerified: true,
      selfDeclaredAge18: true,
      bio: 'Lighthouse admin user for testing admin pages',
      location: 'Test City, TC',
      reputationScore: 100,
      ageVerifiedAt: new Date(),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'lighthouse.moderator@test.com',
      username: 'lighthouse_moderator',
      password: lighthousePassword,
      role: UserRole.MODERATOR,
      isVerified: true,
      emailVerified: true,
      selfDeclaredAge18: true,
      bio: 'Lighthouse moderator user for testing moderation tools',
      location: 'Test City, TC',
      reputationScore: 100,
      ageVerifiedAt: new Date(),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'lighthouse.support@test.com',
      username: 'lighthouse_support',
      password: lighthousePassword,
      role: UserRole.SUPPORT,
      isVerified: true,
      emailVerified: true,
      selfDeclaredAge18: true,
      bio: 'Lighthouse support user for testing support features',
      location: 'Test City, TC',
      reputationScore: 100,
      ageVerifiedAt: new Date(),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    // Regular seed users
    {
      email: 'admin@swapbuds.com',
      username: 'admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isVerified: true,
      selfDeclaredAge18: true,
      bio: 'SwapBuds Platform Administrator',
      location: 'Bucharest, Romania',
      reputationScore: 100,
      ageVerifiedAt: new Date(),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'moderator@swapbuds.com',
      username: 'moderator',
      password: hashedPassword,
      role: UserRole.MODERATOR,
      isVerified: true,
      selfDeclaredAge18: true,
      bio: 'Content Moderator - keeping SwapBuds safe',
      location: 'Cluj-Napoca, Romania',
      reputationScore: 95,
      ageVerifiedAt: new Date(),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'support@swapbuds.com',
      username: 'support',
      password: hashedPassword,
      role: UserRole.SUPPORT,
      isVerified: true,
      selfDeclaredAge18: true,
      bio: 'Support Agent - here to help!',
      location: 'Timișoara, Romania',
      reputationScore: 90,
      ageVerifiedAt: new Date(),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'john.doe@example.com',
      username: 'johndoe',
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      selfDeclaredAge18: true,
      bio: 'Avid collector of vintage electronics and retro games. Looking to trade and expand my collection!',
      location: 'Iași, Romania',
      reputationScore: 85,
      ageVerifiedAt: new Date(),
      dateOfBirth: new Date('1990-05-15'),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'jane.smith@example.com',
      username: 'janesmith',
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      selfDeclaredAge18: true,
      bio: 'Book lover and vinyl record enthusiast. Always happy to trade!',
      location: 'Brașov, Romania',
      reputationScore: 92,
      ageVerifiedAt: new Date(),
      dateOfBirth: new Date('1988-09-22'),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'alex.trader@example.com',
      username: 'alextrader',
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      selfDeclaredAge18: true,
      bio: 'Trading sports equipment and collectibles. Fair trades only!',
      location: 'Constanța, Romania',
      reputationScore: 78,
      ageVerifiedAt: new Date(),
      dateOfBirth: new Date('1995-03-10'),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'maria.garcia@example.com',
      username: 'mariagarcia',
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: false,
      selfDeclaredAge18: true,
      bio: 'New to SwapBuds! Love fashion and home decor items.',
      location: 'Sibiu, Romania',
      reputationScore: 50,
      dateOfBirth: new Date('1992-11-30'),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
    {
      email: 'mike.collector@example.com',
      username: 'mikecollector',
      password: hashedPassword,
      role: UserRole.USER,
      isVerified: true,
      selfDeclaredAge18: true,
      bio: 'Serious collector of action figures, comics, and memorabilia.',
      location: 'Bucharest, Romania',
      reputationScore: 88,
      ageVerifiedAt: new Date(),
      dateOfBirth: new Date('1985-07-18'),
      tosAcceptedAt: new Date(),
      tosVersion: '1.0.0',
      privacyAcceptedAt: new Date(),
      privacyVersion: '1.0.0',
    },
  ];

  const createdUsers = [];

  for (const userData of users) {
    const existingUser = await prisma.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(
        `   ⏭️  User ${userData.username} already exists, skipping...`,
      );
      createdUsers.push(existingUser);
      continue;
    }

    const user = await prisma.user.create({
      data: userData,
    });

    console.log(`   ✅ Created user: ${user.username} (${user.email})`);
    createdUsers.push(user);
  }

  console.log(`✅ Seeded ${createdUsers.length} users`);
  return createdUsers;
}

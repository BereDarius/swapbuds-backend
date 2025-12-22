import { AdminRole, PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

/**
 * Seed users with different roles and verification states
 * Now handles both regular users (User table) and admin users (AdminUser table)
 */
export async function seedUsers(prisma: PrismaClient) {
  console.log('👥 Seeding users and admin users...');

  const hashedPassword = await bcrypt.hash('Password123!', 10);
  const lighthousePassword = await bcrypt.hash('LighthouseTest123!', 10);

  // Admin users data (separate authentication, AdminUser table)
  // AdminUser schema only has: email, username, password, role, isActive
  const adminUsers = [
    {
      email: 'lighthouse.admin@test.com',
      username: 'lighthouse_admin',
      password: lighthousePassword,
      role: AdminRole.ADMIN,
      isActive: true,
    },
    {
      email: 'lighthouse.moderator@test.com',
      username: 'lighthouse_moderator',
      password: lighthousePassword,
      role: AdminRole.MODERATOR,
      isActive: true,
    },
    {
      email: 'lighthouse.support@test.com',
      username: 'lighthouse_support',
      password: lighthousePassword,
      role: AdminRole.SUPPORT,
      isActive: true,
    },
    {
      email: 'admin@swapbuds.com',
      username: 'admin',
      password: hashedPassword,
      role: AdminRole.ADMIN,
      isActive: true,
    },
    {
      email: 'moderator@swapbuds.com',
      username: 'moderator',
      password: hashedPassword,
      role: AdminRole.MODERATOR,
      isActive: true,
    },
    {
      email: 'support@swapbuds.com',
      username: 'support',
      password: hashedPassword,
      role: AdminRole.SUPPORT,
      isActive: true,
    },
  ];

  // Regular users data (User table only, no admin roles)
  const users = [
    // Lighthouse test user (regular user)
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

  // Seed admin users first
  const createdAdminUsers = [];
  for (const adminData of adminUsers) {
    const existingAdmin = await prisma.adminUser.findUnique({
      where: { email: adminData.email },
    });

    if (existingAdmin) {
      console.log(
        `   ⏭️  Admin ${adminData.username} already exists, skipping...`,
      );
      createdAdminUsers.push(existingAdmin);
      continue;
    }

    const admin = await prisma.adminUser.create({
      data: adminData,
    });

    console.log(`   ✅ Created admin: ${admin.username} (${admin.email})`);
    createdAdminUsers.push(admin);
  }

  console.log(`✅ Seeded ${createdAdminUsers.length} admin users`);

  // Seed regular users
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

  console.log(`✅ Seeded ${createdUsers.length} regular users`);
  console.log(
    `📊 Total: ${createdAdminUsers.length} admins + ${createdUsers.length} users`,
  );
  return createdUsers;
}

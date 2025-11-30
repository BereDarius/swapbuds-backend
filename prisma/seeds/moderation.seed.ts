import {
  FlagReason,
  Item,
  ModerationStatus,
  PrismaClient,
  User,
} from '@prisma/client';

/**
 * Seed flagged items and comments for moderation
 */
export async function seedModeration(
  prisma: PrismaClient,
  users: User[],
  items: Item[],
) {
  console.log('🚩 Seeding moderation flags...');

  const regularUsers = users.filter((u) => u.role === 'USER');

  if (regularUsers.length < 2 || items.length < 2) {
    console.log('   ⚠️  Not enough users or items, skipping moderation seed');
    return { flaggedItems: [], flaggedComments: [] };
  }

  // Check for existing flags
  const existingFlags = await prisma.flaggedItem.count();
  if (existingFlags > 0) {
    console.log('   ⏭️  Flags already exist, skipping...');
    return { flaggedItems: [], flaggedComments: [] };
  }

  // Seed flagged items
  const flaggedItemsData = [
    // Pending flag: Inappropriate content
    {
      itemId: items[0]?.id,
      reportedById: regularUsers[1].id, // Jane flagging John's item
      reason: FlagReason.INAPPROPRIATE,
      status: ModerationStatus.PENDING,
      description:
        'This item contains inappropriate images that violate community guidelines.',
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
    // Approved flag: Suspected scam (reviewed and dismissed)
    {
      itemId: items[2]?.id,
      reportedById: regularUsers[2].id, // Alex flagging
      reason: FlagReason.SCAM,
      status: ModerationStatus.APPROVED,
      description:
        'The seller is asking for payment outside the platform. This looks like a scam attempt.',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
      reviewedById: users.find((u) => u.role === 'MODERATOR')?.id,
      reviewNotes:
        'Investigated - no evidence of scam. Item description is clear.',
    },
    // Approved flag: False alarm
    {
      itemId: items[4]?.id,
      reportedById: regularUsers[0].id,
      reason: FlagReason.PROHIBITED,
      status: ModerationStatus.APPROVED,
      description: 'This appears to be a prohibited weapon.',
      reviewNotes:
        'Item reviewed - this is a replica/toy and complies with platform rules.',
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      reviewedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
      reviewedById: users.find((u) => u.role === 'MODERATOR')?.id,
    },
    // Removed flag: Content removed
    {
      itemId: items[6]?.id,
      reportedById: regularUsers[3].id,
      reason: FlagReason.SPAM,
      status: ModerationStatus.REMOVED,
      description: 'This user is posting the same item multiple times.',
      reviewNotes: 'Duplicate items removed. User warned.',
      createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
      reviewedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
      reviewedById: users.find((u) => u.role === 'ADMIN')?.id,
    },
  ];

  const createdFlaggedItems = [];

  for (const flagData of flaggedItemsData) {
    try {
      const flag = await prisma.flaggedItem.create({
        data: flagData,
        include: {
          item: { select: { title: true } },
          reportedBy: { select: { username: true } },
        },
      });

      console.log(
        `   ✅ Created flag: ${flag.item.title} by ${flag.reportedBy.username} (${flag.status})`,
      );
      createdFlaggedItems.push(flag);
    } catch (error) {
      console.log(`   ⚠️  Error creating flag: ${error.message}`);
    }
  }

  // Get some comments for flagging
  const comments = await prisma.comment.findMany({
    take: 3,
  });

  const flaggedCommentsData = [];

  if (comments.length > 0) {
    flaggedCommentsData.push(
      // Pending flagged comment
      {
        commentId: comments[0]?.id,
        reportedById: regularUsers[1].id,
        reason: FlagReason.INAPPROPRIATE,
        status: ModerationStatus.PENDING,
        description: 'This comment contains personal attacks and harassment.',
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 day ago
      },
    );
  }

  const createdFlaggedComments = [];

  for (const flagData of flaggedCommentsData) {
    try {
      const flag = await prisma.flaggedComment.create({
        data: flagData,
        include: {
          comment: { select: { content: true } },
          reportedBy: { select: { username: true } },
        },
      });

      console.log(
        `   ✅ Created comment flag by ${flag.reportedBy.username} (${flag.status})`,
      );
      createdFlaggedComments.push(flag);
    } catch (error) {
      console.log(`   ⚠️  Error creating comment flag: ${error.message}`);
    }
  }

  console.log(
    `✅ Seeded ${createdFlaggedItems.length} item flags and ${createdFlaggedComments.length} comment flags`,
  );
  return {
    flaggedItems: createdFlaggedItems,
    flaggedComments: createdFlaggedComments,
  };
}

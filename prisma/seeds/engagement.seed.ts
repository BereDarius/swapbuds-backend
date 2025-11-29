import { Item, PrismaClient, User } from '@prisma/client';

/**
 * Seed likes and comments for items
 */
export async function seedEngagement(
  prisma: PrismaClient,
  users: User[],
  items: Item[],
) {
  console.log('💬 Seeding engagement (likes & comments)...');

  const regularUsers = users.filter((u) => u.role === 'USER');

  if (regularUsers.length === 0 || items.length === 0) {
    console.log('   ⚠️  Not enough data, skipping engagement seed');
    return;
  }

  // Seed likes
  const likesData = [
    { userId: regularUsers[0].id, itemId: items[4]?.id }, // John likes Vinyl Collection
    { userId: regularUsers[0].id, itemId: items[7]?.id }, // John likes Signed Jersey
    { userId: regularUsers[1].id, itemId: items[0]?.id }, // Jane likes PS4 Pro
    { userId: regularUsers[1].id, itemId: items[11]?.id }, // Jane likes Marvel Figures
    { userId: regularUsers[2].id, itemId: items[1]?.id }, // Alex likes Switch OLED
    { userId: regularUsers[2].id, itemId: items[13]?.id }, // Alex likes LEGO Falcon
    { userId: regularUsers[3].id, itemId: items[5]?.id }, // Maria likes LOTR books
    { userId: regularUsers[3].id, itemId: items[4]?.id }, // Maria likes Vinyl Collection
    { userId: regularUsers[4].id, itemId: items[2]?.id }, // Mike likes Game Boy Collection
    { userId: regularUsers[4].id, itemId: items[12]?.id }, // Mike likes Star Wars Comics
  ].filter((like) => like.itemId);

  let likesCreated = 0;
  for (const likeData of likesData) {
    try {
      await prisma.like.create({
        data: likeData,
      });
      likesCreated++;
    } catch (error) {
      // Skip if already exists
    }
  }
  console.log(`   ✅ Created ${likesCreated} likes`);

  // Seed comments
  const commentsData = [
    {
      userId: regularUsers[1].id, // Jane
      itemId: items[0]?.id, // PS4 Pro
      content:
        'This looks great! Does it come with any games? I might be interested in trading.',
    },
    {
      userId: regularUsers[0].id, // John (reply)
      itemId: items[0]?.id,
      content:
        "Thanks! Unfortunately no games included, but it's in perfect working order.",
    },
    {
      userId: regularUsers[2].id, // Alex
      itemId: items[1]?.id, // Switch OLED
      content:
        'Beautiful condition! What games do you have for it? Would love to see more pictures.',
    },
    {
      userId: regularUsers[4].id, // Mike
      itemId: items[2]?.id, // Game Boy Collection
      content:
        "As a fellow collector, this is an amazing find! The teal one is particularly rare. I'm definitely interested!",
    },
    {
      userId: regularUsers[3].id, // Maria
      itemId: items[4]?.id, // Vinyl Collection
      content:
        'What a fantastic collection! Do any of these have original inserts?',
    },
    {
      userId: regularUsers[1].id, // Jane (reply)
      itemId: items[4]?.id,
      content:
        'Yes! Most of them have the original inserts and sleeves. All well-preserved.',
    },
    {
      userId: regularUsers[2].id, // Alex
      itemId: items[4]?.id,
      content:
        "Pink Floyd's Dark Side of the Moon is a classic! Great condition too.",
    },
    {
      userId: regularUsers[0].id, // John
      itemId: items[11]?.id, // Marvel Figures
      content:
        'These are mint! As a Marvel fan, I appreciate the care you took keeping them in boxes.',
    },
    {
      userId: regularUsers[1].id, // Jane
      itemId: items[12]?.id, // Star Wars Comics
      content:
        'This is a serious collection! Issue #1 must be worth quite a bit on its own.',
    },
    {
      userId: regularUsers[4].id, // Mike (reply)
      itemId: items[12]?.id,
      content:
        "Thank you! It's been a labor of love collecting these over the years. Looking for the right trade!",
    },
  ].filter((comment) => comment.itemId);

  let commentsCreated = 0;
  for (const commentData of commentsData) {
    try {
      await prisma.comment.create({
        data: commentData,
      });
      commentsCreated++;
    } catch (error) {
      console.log(`   ⚠️  Error creating comment: ${error.message}`);
    }
  }
  console.log(`   ✅ Created ${commentsCreated} comments`);

  // Seed comment likes
  const comments = await prisma.comment.findMany({
    take: 5,
  });

  let commentLikesCreated = 0;
  for (const comment of comments) {
    // Have a few users like each comment
    const likers = regularUsers.slice(0, 2);
    for (const liker of likers) {
      try {
        await prisma.commentLike.create({
          data: {
            userId: liker.id,
            commentId: comment.id,
          },
        });
        commentLikesCreated++;
      } catch (error) {
        // Skip if already exists
      }
    }
  }
  console.log(`   ✅ Created ${commentLikesCreated} comment likes`);

  console.log('✅ Engagement seeding completed');
}

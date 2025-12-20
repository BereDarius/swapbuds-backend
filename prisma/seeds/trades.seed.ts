import {
  DeliveryMethod,
  Item,
  PrismaClient,
  TradeItemSide,
  TradeStatus,
  User,
} from '@prisma/client';

/**
 * Seed trades between users
 */
export async function seedTrades(
  prisma: PrismaClient,
  users: User[],
  items: Item[],
) {
  console.log('🤝 Seeding trades...');

  // Get users by email for predictable seeding
  const john = users.find((u) => u.email === 'john.doe@example.com');
  const jane = users.find((u) => u.email === 'jane.smith@example.com');
  const alex = users.find((u) => u.email === 'alex.trader@example.com');
  const maria = users.find((u) => u.email === 'maria.garcia@example.com');
  const mike = users.find((u) => u.email === 'mike.collector@example.com');
  const lighthouseUser = users.find(
    (u) => u.email === 'lighthouse.user@test.com',
  );

  if (
    !john ||
    !jane ||
    !alex ||
    !maria ||
    !mike ||
    !lighthouseUser ||
    items.length < 14
  ) {
    console.log('   ⚠️  Not enough users or items, skipping trades seed');
    return [];
  }

  const tradesData = [
    // Pending trade: Lighthouse user → John
    {
      proposerId: lighthouseUser.id,
      responderId: john.id,
      status: TradeStatus.PENDING,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message: 'Hi! Interested in trading?',
    },
    // Accepted trade: Jane → John
    {
      proposerId: jane.id,
      responderId: john.id,
      status: TradeStatus.ACCEPTED,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message: "I'm interested in your item. Would you trade?",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    // Completed trade: Lighthouse user → Maria (both verified)
    {
      proposerId: lighthouseUser.id,
      responderId: maria.id,
      status: TradeStatus.COMPLETED,
      deliveryMethod: DeliveryMethod.MAIL,
      message: 'Trade completed successfully!',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    // COMPLETED trade: John → Mike (NEEDED FOR DISPUTE TESTS)
    {
      proposerId: john.id,
      responderId: mike.id,
      status: TradeStatus.COMPLETED,
      deliveryMethod: DeliveryMethod.MAIL,
      message: 'Would you be interested in trading?',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    // Rejected trade: Lighthouse user → Maria
    {
      proposerId: lighthouseUser.id,
      responderId: maria.id,
      status: TradeStatus.REJECTED,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message: 'Would you trade?',
    },
    // Pending trade: Jane → John (another pending for testing)
    {
      proposerId: jane.id,
      responderId: john.id,
      status: TradeStatus.PENDING,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message: "I'm really interested in your item!",
      tradeItems: {
        create: [
          {
            itemId: items[6]?.id, // Tennis Racket
            side: TradeItemSide.OFFERED,
            order: 0,
          },
          {
            itemId: items[8]?.id, // Mountain Bike
            side: TradeItemSide.OFFERED,
            order: 1,
          },
          {
            itemId: items[4]?.id, // Vinyl Collection
            side: TradeItemSide.REQUESTED,
            order: 0,
          },
        ],
      },
    },
  ];

  const createdTrades = [];

  for (const tradeData of tradesData) {
    try {
      const trade = await prisma.trade.create({
        data: tradeData as any,
        include: {
          proposer: { select: { username: true } },
          responder: { select: { username: true } },
          tradeItems: {
            include: {
              item: { select: { title: true } },
            },
          },
        },
      });

      console.log(
        `   ✅ Created trade: ${trade.proposer.username} → ${trade.responder.username} (${trade.status})`,
      );
      createdTrades.push(trade);
    } catch (error) {
      console.log(`   ⚠️  Error creating trade: ${error.message}`);
    }
  }

  console.log(`✅ Seeded ${createdTrades.length} trades`);
  return createdTrades;
}

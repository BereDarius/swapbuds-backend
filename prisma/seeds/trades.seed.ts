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

  const regularUsers = users.filter((u) => u.role === 'USER');

  if (regularUsers.length < 2 || items.length < 4) {
    console.log('   ⚠️  Not enough users or items, skipping trades seed');
    return [];
  }

  const tradesData = [
    // Pending trade: John wants Jane's Harry Potter books for his PS4
    {
      proposerId: regularUsers[0].id, // John
      responderId: regularUsers[1].id, // Jane
      itemOfferedId: items[0]?.id, // PS4 Pro
      itemRequestedId: items[3]?.id, // Harry Potter books
      status: TradeStatus.PENDING,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message:
        'Hi! I love Harry Potter and would be willing to trade my PS4 Pro for your complete book set. Let me know!',
    },
    // Accepted trade: Jane accepted Alex's offer
    {
      proposerId: regularUsers[2].id, // Alex
      responderId: regularUsers[1].id, // Jane
      itemOfferedId: items[6]?.id, // Tennis Racket
      itemRequestedId: items[5]?.id, // LOTR Illustrated Edition
      status: TradeStatus.ACCEPTED,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message:
        "I'm interested in your LOTR illustrated edition. Would you trade for my tennis racket?",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    },
    // Completed trade: John and Mike completed a trade (both verified users)
    {
      proposerId: regularUsers[0].id, // John (verified)
      responderId: regularUsers[4].id, // Mike (verified)
      itemOfferedId: items[1]?.id, // Nintendo Switch
      itemRequestedId: items[11]?.id, // Marvel Legends figures
      status: TradeStatus.COMPLETED,
      deliveryMethod: DeliveryMethod.MAIL,
      message:
        'Would you be interested in trading some of your Marvel figures for my Nintendo Switch?',
      completedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
    },
    // Rejected trade: John's offer was declined
    {
      proposerId: regularUsers[0].id, // John
      responderId: regularUsers[4].id, // Mike
      itemOfferedId: items[2]?.id, // Game Boy Collection
      itemRequestedId: items[13]?.id, // LEGO Millennium Falcon
      status: TradeStatus.REJECTED,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message: 'Would you trade your LEGO Falcon for my Game Boy collection?',
    },
    // Multi-item trade: Alex offering multiple sports items for vinyl collection
    {
      proposerId: regularUsers[2].id, // Alex
      responderId: regularUsers[1].id, // Jane
      status: TradeStatus.PENDING,
      deliveryMethod: DeliveryMethod.PHYSICAL,
      message:
        "I'm really interested in your vinyl collection! Would you consider multiple items?",
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

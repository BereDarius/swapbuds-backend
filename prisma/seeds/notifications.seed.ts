import {
  NotificationType,
  PrismaClient,
  SupportChatStatus,
  SupportPriority,
  User,
} from '@prisma/client';

/**
 * Seed notifications and support chats
 */
export async function seedNotificationsAndSupport(
  prisma: PrismaClient,
  users: User[],
) {
  console.log('🔔 Seeding notifications and support...');

  const regularUsers = users.filter((u) => u.role === 'USER');
  const supportAgent = users.find((u) => u.role === 'SUPPORT');

  // Seed notifications
  const notificationsData = [
    {
      userId: regularUsers[0]?.id,
      type: NotificationType.NEW_MESSAGE,
      title: 'New Message',
      message: 'Jane sent you a message about your PS4 Pro',
      isRead: false,
    },
    {
      userId: regularUsers[1]?.id,
      type: NotificationType.TRADE_PROPOSAL,
      title: 'New Trade Proposal',
      message: 'John proposed a trade for your Harry Potter books',
      isRead: true,
    },
    {
      userId: regularUsers[2]?.id,
      type: NotificationType.TRADE_ACCEPTED,
      title: 'Trade Accepted!',
      message: 'Jane accepted your trade proposal',
      isRead: false,
    },
    {
      userId: regularUsers[3]?.id,
      type: NotificationType.TRADE_COMPLETED,
      title: 'Trade Completed',
      message: 'Your trade with Mike is complete! Please leave a review.',
      isRead: false,
    },
    {
      userId: regularUsers[4]?.id,
      type: NotificationType.NEW_COMMENT,
      title: 'New Comment',
      message: 'Someone commented on your Marvel Legends collection',
      isRead: true,
    },
  ].filter((n) => n.userId);

  let notificationsCreated = 0;
  for (const notifData of notificationsData) {
    try {
      await prisma.notification.create({
        data: notifData,
      });
      notificationsCreated++;
    } catch (error) {
      // Skip on error
    }
  }
  console.log(`   ✅ Created ${notificationsCreated} notifications`);

  // Seed support chats
  if (supportAgent && regularUsers.length > 0) {
    const supportChatsData = [
      {
        userId: regularUsers[0].id,
        agentId: supportAgent.id,
        status: SupportChatStatus.RESOLVED,
        priority: SupportPriority.MEDIUM,
        subject: 'Question about trade delivery methods',
        messages: {
          create: [
            {
              senderId: regularUsers[0].id,
              message:
                'Hi, I have a question about delivery methods. Can I change the delivery method after a trade is accepted?',
            },
            {
              senderId: supportAgent.id,
              message:
                'Hello! Yes, you can change the delivery method by mutual agreement with the other trader. Just message them in the trade chat and agree on the new method.',
            },
            {
              senderId: regularUsers[0].id,
              message: 'Great, thank you for the quick response!',
            },
          ],
        },
        resolvedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
      {
        userId: regularUsers[3].id,
        agentId: supportAgent.id,
        status: SupportChatStatus.ACTIVE,
        priority: SupportPriority.HIGH,
        subject: 'Issue with ID verification',
        messages: {
          create: [
            {
              senderId: regularUsers[3].id,
              message:
                "I submitted my ID verification 3 days ago but haven't heard back yet. Can you check the status?",
            },
            {
              senderId: supportAgent.id,
              message:
                "I'm checking on that for you now. Let me look into your verification status...",
            },
          ],
        },
        startedAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      },
      {
        userId: regularUsers[2].id,
        status: SupportChatStatus.WAITING,
        priority: SupportPriority.LOW,
        subject: 'General question about platform features',
        queuePosition: 1,
        messages: {
          create: [
            {
              senderId: regularUsers[2].id,
              message:
                'Hi, I wanted to ask about the counter-offer feature. How does it work exactly?',
            },
          ],
        },
      },
    ];

    let chatsCreated = 0;
    for (const chatData of supportChatsData) {
      try {
        await prisma.supportChat.create({
          data: chatData as any,
        });
        chatsCreated++;
      } catch (error) {
        console.log(`   ⚠️  Error creating support chat: ${error.message}`);
      }
    }
    console.log(`   ✅ Created ${chatsCreated} support chats`);
  }

  // Seed notification preferences for regular users
  let prefsCreated = 0;
  for (const user of regularUsers) {
    try {
      await prisma.notificationPreferences.create({
        data: {
          userId: user.id,
          emailTradeProposal: true,
          emailTradeAccepted: true,
          emailNewMessage: true,
          pushTradeProposal: true,
          pushNewMessage: true,
        },
      });
      prefsCreated++;
    } catch (error) {
      // Skip if already exists
    }
  }
  console.log(`   ✅ Created ${prefsCreated} notification preferences`);

  console.log('✅ Notifications and support seeding completed');
}

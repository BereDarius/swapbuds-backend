import {
  PrismaClient,
  SupportChatStatus,
  SupportPriority,
  User,
} from '@prisma/client';

/**
 * Seed support chats and messages
 */
export async function seedSupport(prisma: PrismaClient, users: User[]) {
  console.log('🎫 Seeding support chats...');

  const regularUsers = users.filter((u) => u.role === 'USER');
  const supportAgent = users.find((u) => u.role === 'SUPPORT');

  if (regularUsers.length < 2 || !supportAgent) {
    console.log(
      '   ⚠️  Not enough users or no support agent, skipping support seed',
    );
    return [];
  }

  // Check for existing chats
  const existingCount = await prisma.supportChat.count();
  if (existingCount > 0) {
    console.log('   ⏭️  Support chats already exist, skipping...');
    return [];
  }

  const chatsData = [
    // Waiting chat: User in queue (high priority)
    {
      userId: regularUsers[0].id, // John
      status: SupportChatStatus.WAITING,
      priority: SupportPriority.HIGH,
      subject: 'Cannot change email address',
      queuePosition: 1,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      messages: {
        create: [
          {
            senderId: regularUsers[0].id,
            message:
              "I'm trying to update my email address in settings but keep getting an error message. I've tried multiple times but it won't save. Please help!",
            createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
          },
        ],
      },
    },
    // Active chat: Agent helping user
    {
      userId: regularUsers[1].id, // Jane
      agentId: supportAgent.id,
      status: SupportChatStatus.ACTIVE,
      priority: SupportPriority.MEDIUM,
      subject: 'Trade partner not responding',
      queuePosition: null,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
      startedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000), // 4 days ago
      messages: {
        create: [
          {
            senderId: regularUsers[1].id,
            message:
              'I accepted a trade 5 days ago but the other person has not responded to my messages about shipping details. What should I do?',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: supportAgent.id,
            message:
              "Hi Jane, thank you for contacting support. I can see the trade you're referring to. Let me reach out to the other user and see what's going on. I'll get back to you within 24 hours.",
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: regularUsers[1].id,
            message: 'Thank you! I appreciate your help.',
            createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: supportAgent.id,
            message:
              "I've sent a notification to the other user. If they don't respond within 48 hours, we can cancel the trade and you can relist your item. I'll keep you updated!",
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
    // Resolved chat: Issue fixed
    {
      userId: regularUsers[3].id, // Maria
      agentId: supportAgent.id,
      status: SupportChatStatus.RESOLVED,
      priority: SupportPriority.MEDIUM,
      subject: 'ID verification keeps failing',
      queuePosition: null,
      createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      startedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      messages: {
        create: [
          {
            senderId: regularUsers[3].id,
            message:
              'I submitted my ID for verification but it was rejected. The reason said the photo was blurry but it looks clear to me. Can you help?',
            createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: supportAgent.id,
            message:
              "Hi Maria, I've reviewed your submission. The issue is that the corners of your ID are cut off in the photo. Please submit a new photo ensuring the entire document is visible within the frame. Also make sure the photo is taken in good lighting.",
            createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: regularUsers[3].id,
            message:
              'Oh I see! Thank you, I will resubmit with a better photo.',
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: supportAgent.id,
            message:
              "You're welcome! Let me know once you've resubmitted and I'll prioritize your review.",
            isSystem: false,
            createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
    // Closed chat: Question answered
    {
      userId: regularUsers[2].id, // Alex
      agentId: supportAgent.id,
      status: SupportChatStatus.CLOSED,
      priority: SupportPriority.LOW,
      subject: 'Do I need to pay to use SwapBuds?',
      queuePosition: null,
      createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
      startedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      resolvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      closedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      messages: {
        create: [
          {
            senderId: regularUsers[2].id,
            message:
              "I just joined and I'm wondering if there are any fees for using the platform. I couldn't find clear information about this.",
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: supportAgent.id,
            message:
              'Great question! SwapBuds is completely FREE to use. There are no listing fees, no transaction fees, and no hidden charges. We believe in making peer-to-peer trading accessible to everyone. The only costs you might have are shipping if you choose to mail items. Is there anything else I can help you with?',
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
          {
            senderId: regularUsers[2].id,
            message:
              "That's awesome! Thank you for the quick response. That's all I needed to know!",
            createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  ];

  const createdChats = [];

  for (const chatData of chatsData) {
    try {
      const chat = await prisma.supportChat.create({
        data: chatData,
        include: {
          user: { select: { username: true } },
          messages: { select: { id: true } },
        },
      });

      console.log(
        `   ✅ Created chat: ${chat.subject} by ${chat.user.username} (${chat.status}) - ${chat.messages.length} messages`,
      );
      createdChats.push(chat);
    } catch (error) {
      console.log(`   ⚠️  Error creating chat: ${error.message}`);
    }
  }

  console.log(`✅ Seeded ${createdChats.length} support chats`);
  return createdChats;
}
